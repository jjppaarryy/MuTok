import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getPendingShareCount24h } from "../../../../lib/queue";
import { getSchedulerStatus } from "../../../../lib/schedulerState";
import { getCooldown } from "../../../../lib/tiktokSettings";

export async function GET() {
  const [
    clipCount,
    trackCount,
    approvedSnippets,
    draftCount,
    pendingCount,
    auth,
    cooldownUntil
  ] =
    await Promise.all([
      prisma.clip.count(),
      prisma.track.count(),
      prisma.snippet.count({ where: { approved: true } }),
      prisma.postPlan.count({ where: { status: "UPLOADED_DRAFT" } }),
      getPendingShareCount24h(),
      prisma.tikTokAuth.findFirst(),
      getCooldown()
    ]);

  return NextResponse.json({
    clipCount,
    trackCount,
    approvedSnippets,
    draftCount,
    pendingCount,
    authConnected: Boolean(auth),
    authExpiresAt: auth?.expiresAt ?? null,
    scheduler: getSchedulerStatus(),
    uploadCooldownUntil: cooldownUntil
  });
}
