import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getDailyDraftUploadCount, getPendingShareCount24h } from "../../../../lib/queue";
import { getSchedulerStatus } from "../../../../lib/schedulerState";
import { getCooldown } from "../../../../lib/tiktokSettings";
import { getRulesSettings } from "../../../../lib/settings";
import { getRecoveryStatus } from "../../../../lib/recoveryMode";

export async function GET() {
  const [
    clipCount,
    trackCount,
    approvedSnippets,
    draftCount,
    pendingCount,
    dailyUploads,
    auth,
    cooldownUntil,
    recovery
  ] =
    await Promise.all([
      prisma.clip.count(),
      prisma.track.count(),
      prisma.snippet.count({ where: { approved: true } }),
      prisma.postPlan.count({ where: { status: "UPLOADED_DRAFT" } }),
      getPendingShareCount24h(),
      getDailyDraftUploadCount(),
      prisma.tikTokAuth.findFirst(),
      getCooldown(),
      getRulesSettings().then((rules) => getRecoveryStatus(rules))
    ]);

  return NextResponse.json({
    clipCount,
    trackCount,
    approvedSnippets,
    draftCount,
    pendingCount,
    dailyUploads,
    authConnected: Boolean(auth),
    authExpiresAt: auth?.expiresAt ?? null,
    scheduler: getSchedulerStatus(),
    uploadCooldownUntil: cooldownUntil,
    recovery
  });
}
