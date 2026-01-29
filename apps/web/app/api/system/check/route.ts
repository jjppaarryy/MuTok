import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { access } from "fs/promises";
import { execFile } from "child_process";
import path from "path";
import { getSchedulerStatus } from "../../../../lib/schedulerState";
import { getCooldown } from "../../../../lib/tiktokSettings";
import { getDraftCount } from "../../../../lib/queue";
import { buildPlans } from "../../../../lib/planner";
import { renderPostPlan } from "../../../../lib/render";

const checkFfmpeg = () =>
  new Promise<boolean>((resolve) => {
    execFile("ffmpeg", ["-version"], (error) => {
      resolve(!error);
    });
  });

export async function GET() {
  const envs = [
    "TIKTOK_CLIENT_ID",
    "TIKTOK_CLIENT_SECRET",
    "TIKTOK_REDIRECT_URI",
    "OPENAI_API_KEY"
  ];
  const envStatus = envs.map((key) => ({
    key,
    present: Boolean(process.env[key])
  }));

  const dataDirs = ["data/clips", "data/tracks", "data/renders"].map((dir) =>
    path.join(process.cwd(), "..", "..", dir)
  );
  const dirChecks = await Promise.all(
    dataDirs.map(async (dir) => {
      try {
        await access(dir);
        return { dir, ok: true };
      } catch {
        return { dir, ok: false };
      }
    })
  );

  const [ffmpegOk, clipCount, trackCount, snippetCount, auth, cooldown] =
    await Promise.all([
      checkFfmpeg(),
      prisma.clip.count(),
      prisma.track.count(),
      prisma.snippet.count({ where: { approved: true } }),
      prisma.tikTokAuth.findFirst(),
      getCooldown()
    ]);

  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }

  return NextResponse.json({
    envStatus,
    dirChecks,
    ffmpegOk,
    dbOk,
    assets: { clipCount, trackCount, approvedSnippets: snippetCount },
    authConnected: Boolean(auth),
    authExpiresAt: auth?.expiresAt ?? null,
    scheduler: getSchedulerStatus(),
    uploadCooldownUntil: cooldown
  });
}

export async function POST() {
  const created: string[] = [];
  const rendered: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  try {
    const needed = 2;
    const result = await buildPlans(needed);
    created.push(...result.createdIds);

    for (const id of result.createdIds) {
      try {
        await renderPostPlan(id);
        rendered.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : "Render failed"
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 }
    );
  }

  const draftCount = await getDraftCount();
  return NextResponse.json({ created, rendered, failed, draftCount });
}
