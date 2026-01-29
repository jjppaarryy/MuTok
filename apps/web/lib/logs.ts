import { prisma } from "./prisma";

export async function logRunError(params: {
  runType: string;
  error: string;
  payloadExcerpt?: string;
}) {
  await prisma.runLog.create({
    data: {
      runType: params.runType,
      startedAt: new Date(),
      finishedAt: new Date(),
      status: "FAILED",
      error: params.error,
      payloadExcerpt: params.payloadExcerpt
    }
  });
}

export async function logRunEvent(params: {
  runType: string;
  status?: string;
  payloadExcerpt?: string;
}) {
  await prisma.runLog.create({
    data: {
      runType: params.runType,
      startedAt: new Date(),
      finishedAt: new Date(),
      status: params.status ?? "OK",
      payloadExcerpt: params.payloadExcerpt
    }
  });
}
