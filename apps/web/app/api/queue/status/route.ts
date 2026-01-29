import { NextResponse } from "next/server";
import { getDraftCount, getPendingShareCount24h, canUploadMore } from "../../../../lib/queue";
import { getCooldown } from "../../../../lib/tiktokSettings";

export async function GET() {
  const draftCount = await getDraftCount();
  const pendingCount = await getPendingShareCount24h();
  const cooldown = await getCooldown();
  return NextResponse.json({
    draftCount,
    pendingCount,
    canUploadMore: canUploadMore(pendingCount),
    uploadCooldownUntil: cooldown
  });
}
