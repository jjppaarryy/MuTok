import { NextRequest, NextResponse } from "next/server";
import { requireLocalRequest } from "../../../../lib/auth";
import { createTikTokClient } from "../../../../../../packages/core/src/tiktok";
import { getValidAccessToken } from "../../../../lib/tiktokAuth";
import { getTikTokSettings } from "../../../../lib/tiktokSettings";
import { prisma } from "../../../../lib/prisma";

type PublishStatusResponse = {
  data?: {
    status: "PROCESSING_UPLOAD" | "PROCESSING_DOWNLOAD" | "PUBLISH_COMPLETE" | "FAILED";
    fail_reason?: string;
    publicaly_available_post_id?: string[];
    uploaded_bytes?: number;
  };
  error?: {
    code: string;
    message: string;
  };
};

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  const publishId = request.nextUrl.searchParams.get("publishId");
  const postPlanId = request.nextUrl.searchParams.get("postPlanId");

  if (!publishId && !postPlanId) {
    return NextResponse.json(
      { error: "Missing publishId or postPlanId" },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    let targetPublishId = publishId;

    // If postPlanId provided, look up the publishId
    if (!targetPublishId && postPlanId) {
      const postPlan = await prisma.postPlan.findUnique({
        where: { id: postPlanId },
        select: { tiktokPublishId: true }
      });
      targetPublishId = postPlan?.tiktokPublishId ?? null;
    }

    if (!targetPublishId) {
      return NextResponse.json(
        { error: "No publish ID found for this post" },
        { status: 404 }
      );
    }

    const settings = await getTikTokSettings();
    const client = createTikTokClient({
      accessToken,
      sandbox: settings.sandbox
    });

    console.log("[publish-status] Checking status for:", targetPublishId);
    const response = (await client.getPublishStatus(targetPublishId)) as PublishStatusResponse;
    console.log("[publish-status] Response:", JSON.stringify(response));

    // TikTok returns error.code="ok" on success, so only treat non-"ok" as errors
    if (response.error && response.error.code !== "ok") {
      console.log("[publish-status] Error:", response.error);
      return NextResponse.json(
        { error: response.error.message, code: response.error.code },
        { status: 400 }
      );
    }

    const status = response.data?.status;
    let displayStatus: string;
    
    switch (status) {
      case "PROCESSING_UPLOAD":
      case "PROCESSING_DOWNLOAD":
        displayStatus = "PROCESSING";
        break;
      case "PUBLISH_COMPLETE":
        displayStatus = "READY";
        break;
      case "FAILED":
        displayStatus = "FAILED";
        break;
      default:
        displayStatus = status || "UNKNOWN";
    }

    return NextResponse.json({
      publishId: targetPublishId,
      status: displayStatus,
      rawStatus: status,
      failReason: response.data?.fail_reason,
      postIds: response.data?.publicaly_available_post_id
    });
  } catch (error) {
    console.error("[publish-status] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
