import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { createTikTokClient } from "../../../../../../../packages/core/src/tiktok";
import { getValidAccessToken } from "../../../../../lib/tiktokAuth";
import { getTikTokSettings } from "../../../../../lib/tiktokSettings";
import { logRunError } from "../../../../../lib/logs";
import { isCooldownActive, setCooldown } from "../../../../../lib/tiktokSettings";

const isSpamRisk = (message: string) => message.includes("spam_risk");
import { readFile, stat } from "fs/promises";

type UploadInitResponse = {
  data?: {
    upload_url?: string;
    publish_id?: string;
  };
};
const mapPrivacyLevel = (visibility: string): string => {
  switch (visibility) {
    case "PUBLIC":
      return "PUBLIC_TO_EVERYONE";
    case "FRIENDS":
      return "MUTUAL_FOLLOW_FRIENDS";
    case "PRIVATE":
    default:
      return "SELF_ONLY";
  }
};
import { getPendingShareCount24h, canUploadMore } from "../../../../../lib/queue";

export async function POST(request: Request) {
  try {
    if (await isCooldownActive()) {
      return NextResponse.json(
        { error: "Upload cooldown active due to spam risk." },
        { status: 429 }
      );
    }
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const limit = body.limit ?? 2;

    const pendingCount = await getPendingShareCount24h();
    if (!canUploadMore(pendingCount) || pendingCount >= 4) {
      return NextResponse.json(
        { warning: "Pending share cap reached. Uploads paused." },
        { status: 429 }
      );
    }

    const availableSlots = Math.max(0, 5 - pendingCount);
    if (availableSlots === 0) {
      return NextResponse.json(
        { warning: "Pending share cap reached. Uploads paused." },
        { status: 429 }
      );
    }

    const maxUploads = pendingCount <= 1 ? 2 : 1;
    const cappedLimit = Math.min(limit, availableSlots, maxUploads);

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const settings = await getTikTokSettings();
    const client = createTikTokClient({
      accessToken,
      sandbox: settings.sandbox
    });

    await client.getCreatorInfo();

    const plans = await prisma.$transaction(async (tx) => {
      const candidates = await tx.postPlan.findMany({
        where: { status: "RENDERED" },
        orderBy: { createdAt: "asc" },
        take: cappedLimit
      });
      if (candidates.length === 0) return [];
      await tx.postPlan.updateMany({
        where: { id: { in: candidates.map((plan) => plan.id) }, status: "RENDERED" },
        data: { status: "UPLOADING" }
      });
      return tx.postPlan.findMany({
        where: { id: { in: candidates.map((plan) => plan.id) }, status: "UPLOADING" },
        orderBy: { createdAt: "asc" }
      });
    });

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const plan of plans) {
      if (!plan.renderPath) {
        await prisma.postPlan.update({ where: { id: plan.id }, data: { status: "FAILED" } });
        results.push({ id: plan.id, status: "FAILED", error: "Missing renderPath" });
        continue;
      }

      const clipIds = plan.clipIds as string[];
      const clips = await prisma.clip.findMany({
        where: { id: { in: clipIds } }
      });
      if (clips.some((clip) => clip.sync === "critical")) {
        await prisma.postPlan.update({ where: { id: plan.id }, data: { status: "FAILED" } });
        results.push({
          id: plan.id,
          status: "FAILED",
          error: "Critical sync clip detected. Upload blocked."
        });
        continue;
      }

      const fileStats = await stat(plan.renderPath);
      const exportDefaults = settings.export_defaults;
      const baseTitle = (plan.caption || exportDefaults.caption || "Draft from TikTok Growth Agent").trim();
      const title = baseTitle.length > 2200 ? `${baseTitle.slice(0, 2197)}...` : baseTitle;
      const privacyLevel = settings.sandbox ? "SELF_ONLY" : mapPrivacyLevel(exportDefaults.visibility ?? "PUBLIC");
      const initResponse = await client.initializeUpload({
        post_info: {
          title,
          privacy_level: privacyLevel,
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

      const uploadUrl = (initResponse as UploadInitResponse)?.data?.upload_url;
      if (!uploadUrl) {
        await prisma.postPlan.update({ where: { id: plan.id }, data: { status: "FAILED" } });
        results.push({ id: plan.id, status: "FAILED", error: "Missing upload_url" });
        continue;
      }

      const videoBuffer = await readFile(plan.renderPath);
      const arrayBuffer = videoBuffer.buffer.slice(
        videoBuffer.byteOffset,
        videoBuffer.byteOffset + videoBuffer.byteLength
      );
      try {
        await client.uploadVideo(uploadUrl, arrayBuffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        if (isSpamRisk(message)) {
          await setCooldown(24);
        }
        await prisma.postPlan.update({ where: { id: plan.id }, data: { status: "RENDERED" } });
        results.push({
          id: plan.id,
          status: "FAILED",
          error: isSpamRisk(message) ? "spam_risk cooldown triggered" : message
        });
        if (isSpamRisk(message)) break;
        continue;
      }

      await prisma.postPlan.update({
        where: { id: plan.id },
        data: {
          status: "UPLOADED_DRAFT",
          tiktokPublishId: (initResponse as UploadInitResponse)?.data?.publish_id ?? null
        }
      });

      results.push({ id: plan.id, status: "UPLOADED_DRAFT" });
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Batch upload failed";
    if (isSpamRisk(message)) {
      await setCooldown(24);
    }
    await logRunError({
      runType: "tiktok_upload_batch",
      error: message
    });
    return NextResponse.json({ error: "Batch upload failed" }, { status: 500 });
  }
}
