import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { prisma } from "../../../../../lib/prisma";
import { resolveFfprobe } from "../../../../../lib/ffmpegRender";
import { requireLocalRequest } from "../../../../../lib/auth";

const getDurationSec = (filePath: string) =>
  new Promise<number | null>((resolve) => {
    execFile(
      resolveFfprobe(),
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath
      ],
      (error, stdout) => {
        if (error) {
          console.warn(`[clip backfill] FFprobe failed for ${filePath}:`, error.message);
          resolve(null);
          return;
        }
        const duration = Number.parseFloat(stdout.trim());
        resolve(Number.isFinite(duration) ? duration : null);
      }
    );
  });

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  const clips = await prisma.clip.findMany({
    where: { durationSec: { lte: 0 } },
    orderBy: { createdAt: "asc" }
  });

  let updated = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const clip of clips) {
    const duration = await getDurationSec(clip.filePath);
    if (!duration || duration <= 0) {
      failures.push({ id: clip.id, error: "ffprobe_failed" });
      continue;
    }
    await prisma.clip.update({
      where: { id: clip.id },
      data: { durationSec: duration }
    });
    updated += 1;
  }

  return NextResponse.json({
    checked: clips.length,
    updated,
    failures
  });
}

