import { prisma } from "./prisma";
import { logRunEvent } from "./logs";

export async function finalizeBrainRun(
  repairCount: number,
  prompt: string,
  responseText: string
) {
  if (repairCount > 0) {
    await logRunEvent({
      runType: "brain_repair",
      status: "WARN",
      payloadExcerpt: `count=${repairCount}`
    });
  }

  await prisma.runLog.create({
    data: {
      runType: "brain_run",
      startedAt: new Date(),
      finishedAt: new Date(),
      status: "SUCCESS",
      payloadExcerpt: prompt.slice(0, 1000),
      error: responseText.slice(0, 1000)
    }
  });
}
