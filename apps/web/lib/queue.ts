import { prisma } from "./prisma";
import { DateTime } from "luxon";

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
      status: { in: ["UPLOADED_DRAFT", "UPLOADING", "RENDERED", "PLANNED"] },
      createdAt: { gte: since }
    }
  });
}

export function canUploadMore(pendingCount: number) {
  return pendingCount < 5;
}

export async function getDailyDraftUploadCount() {
  const start = DateTime.local().startOf("day").toJSDate();
  return prisma.postPlan.count({
    where: {
      status: { in: ["UPLOADED_DRAFT"] },
      updatedAt: { gte: start }
    }
  });
}
