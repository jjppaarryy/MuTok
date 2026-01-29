import { prisma } from "./prisma";

export const DRAFT_STATUSES = ["UPLOADED_DRAFT"] as const;

export async function getDraftCount() {
  return prisma.postPlan.count({
    where: { status: { in: [...DRAFT_STATUSES] } }
  });
}

export async function getPendingShareCount24h() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.postPlan.count({
    where: {
      status: { in: ["UPLOADED_DRAFT", "RENDERED", "PLANNED"] },
      createdAt: { gte: since }
    }
  });
}

export function canUploadMore(pendingCount: number) {
  return pendingCount < 5;
}
