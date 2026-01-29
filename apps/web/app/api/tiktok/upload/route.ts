import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createTikTokClient } from "../../../../../../packages/core/src/tiktok";
import { getValidAccessToken } from "../../../../lib/tiktokAuth";
import { getTikTokSettings } from "../../../../lib/tiktokSettings";
import { logRunError } from "../../../../lib/logs";
import { getPendingShareCount24h } from "../../../../lib/queue";
import { isCooldownActive, setCooldown } from "../../../../lib/tiktokSettings";

const isSpamRisk = (message: string) => message.includes("spam_risk");
import { readFile, stat } from "fs/promises";

export async function POST(request: Request) {
  try {
    if (await isCooldownActive()) {
      return NextResponse.json(
        { error: "Upload cooldown active due to spam risk." },
        { status: 429 }
      );
    }

    const pendingCount = await getPendingShareCount24h();
    if (pendingCount >= 4) {
      return NextResponse.json(
        { error: "Pending share cap near limit. Upload blocked." },
        { status: 429 }
      );
    }
    const { postPlanId } = (await request.json()) as { postPlanId?: string };
    if (!postPlanId) {
      return NextResponse.json({ error: "Missing postPlanId" }, { status: 400 });
    }

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const postPlan = await prisma.postPlan.findUnique({
      where: { id: postPlanId }
    });

    if (!postPlan) {
      return NextResponse.json({ error: "PostPlan not found" }, { status: 404 });
    }

    const clipIds = postPlan.clipIds as string[];
    const clips = await prisma.clip.findMany({
      where: { id: { in: clipIds } }
    });
    if (clips.some((clip) => clip.sync === "critical")) {
      return NextResponse.json(
        { error: "Critical sync clip detected. Upload blocked." },
        { status: 400 }
      );
    }

    const settings = await getTikTokSettings();
    const client = createTikTokClient({
      accessToken,
      sandbox: settings.sandbox
    });

    if (!postPlan.renderPath) {
      return NextResponse.json({ error: "Missing renderPath" }, { status: 400 });
    }

    await client.getCreatorInfo();

    const fileStats = await stat(postPlan.renderPath);

    const exportDefaults = settings.export_defaults;
    const initResponse = await client.initializeUpload({
      post_info: {
        title: postPlan.caption || exportDefaults.caption,
        privacy_level: exportDefaults.visibility,
        disable_comment: !exportDefaults.allowComment,
        disable_duet: !exportDefaults.allowDuet,
        disable_stitch: !exportDefaults.allowStitch,
        branded_content: exportDefaults.brandedContent,
        brand_content_toggle: exportDefaults.promoteYourself
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: fileStats.size,
        chunk_size: fileStats.size,
        total_chunk_count: 1
      }
    });

    const uploadUrl = (initResponse as any)?.data?.upload_url;
    if (!uploadUrl) {
      return NextResponse.json({ error: "Missing upload_url" }, { status: 500 });
    }

    const videoBuffer = await readFile(postPlan.renderPath);
    const arrayBuffer = videoBuffer.buffer.slice(
      videoBuffer.byteOffset,
      videoBuffer.byteOffset + videoBuffer.byteLength
    );
    await client.uploadVideo(uploadUrl, arrayBuffer);

    await prisma.postPlan.update({
      where: { id: postPlanId },
      data: {
        status: "UPLOADED_DRAFT",
        tiktokPublishId: (initResponse as any)?.data?.publish_id ?? null
      }
    });

    return NextResponse.json({ status: "UPLOADED_DRAFT" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (isSpamRisk(message)) {
      await setCooldown(24);
    }
    await logRunError({
      runType: "tiktok_upload",
      error: message
    });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
