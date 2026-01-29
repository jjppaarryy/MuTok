import path from "path";
import { mkdir, readFile } from "fs/promises";
import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";
import {
  renderStatic,
  renderMontage,
  renderAudioSnippet,
  resolveFfprobe
} from "./ffmpegRender";
import { createHash } from "crypto";
import { execFile } from "child_process";

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
          console.warn(`FFprobe failed for ${filePath}:`, error.message);
          resolve(null);
          return;
        }
        const duration = Number.parseFloat(stdout.trim());
        resolve(Number.isFinite(duration) ? duration : null);
      }
    );
  });

const buildMontagePlan = async (params: {
  clipPaths: string[];
  totalDuration: number;
  minDur: number;
  maxDur: number;
  requireFirstCut: boolean;
}) => {
  const clipDurations = await Promise.all(
    params.clipPaths.map((clipPath) => getDurationSec(clipPath))
  );
  const safeCap = (index: number) => {
    const raw = clipDurations[index] ?? params.maxDur;
    return Math.max(0.2, raw - 0.05);
  };

  const resultPaths: string[] = [...params.clipPaths];
  const durations: number[] = [];
  const span = Math.max(0.1, params.maxDur - params.minDur);
  const firstDuration =
    params.requireFirstCut && resultPaths.length > 0
      ? Math.min(2.5, safeCap(0))
      : 0;
  if (firstDuration) {
    durations.push(firstDuration);
  }
  const startIndex = firstDuration ? 1 : 0;
  for (let i = startIndex; i < resultPaths.length; i += 1) {
    const cap = safeCap(i);
    const randomDuration = params.minDur + Math.random() * span;
    durations.push(Math.min(cap, randomDuration));
  }

  let total = durations.reduce((sum, value) => sum + value, 0);
  let safety = 0;
  while (total < params.totalDuration && safety < 50) {
    for (let i = 0; i < params.clipPaths.length; i += 1) {
      const cap = safeCap(i);
      const randomDuration = params.minDur + Math.random() * span;
      resultPaths.push(params.clipPaths[i]);
      const nextDuration = Math.min(cap, randomDuration);
      durations.push(nextDuration);
      total += nextDuration;
      if (total >= params.totalDuration) break;
    }
    safety += 1;
  }

  if (total > 0 && total !== params.totalDuration) {
    const scale = params.totalDuration / total;
    for (let i = 0; i < durations.length; i += 1) {
      const cap = safeCap(i % params.clipPaths.length);
      durations[i] = Math.min(cap, Math.max(0.2, durations[i] * scale));
    }
  }

  return { clipPaths: resultPaths, durations };
};

export async function renderPostPlan(postPlanId: string) {
  const plan = await prisma.postPlan.findUnique({
    where: { id: postPlanId }
  });

  if (!plan) {
    throw new Error("PostPlan not found");
  }

  const clipIds = (plan.clipIds as string[]) ?? [];
  const clips = await prisma.clip.findMany({
    where: { id: { in: clipIds } }
  });

  if (clips.length !== clipIds.length) {
    throw new Error("Missing clip assets for render");
  }

  const snippet = await prisma.snippet.findUnique({
    where: { id: plan.snippetId }
  });

  const track = await prisma.track.findUnique({
    where: { id: plan.trackId }
  });

  if (!snippet || !track) {
    throw new Error("Missing track or snippet for render");
  }

  const rules = await getRulesSettings();
  const baseDir = path.join(process.cwd(), "..", "..", "data", "renders");
  const audioDir = path.join(baseDir, "audio");
  const concatDir = path.join(baseDir, "concat");
  await mkdir(audioDir, { recursive: true });
  await mkdir(concatDir, { recursive: true });

  const audioPath = path.join(audioDir, `${postPlanId}.m4a`);
  await renderAudioSnippet({
    inputPath: track.filePath,
    outputPath: audioPath,
    startSec: snippet.startSec,
    durationSec: snippet.durationSec
  });

  const outputPath = path.join(baseDir, `${postPlanId}.mp4`);
  await mkdir(path.dirname(outputPath), { recursive: true });

  const clipPaths = clips.map((clip) => clip.filePath);
  const concatFilePath = path.join(concatDir, `${postPlanId}.txt`);

  // Ensure onscreenText is always a string (handle null case)
  const onscreenText = plan.onscreenText ?? "";
  console.log(`[renderPostPlan] Rendering with text: "${onscreenText}"`);

  if (plan.container === "montage") {
    const [minDur, maxDur] = rules.montage.clip_duration_range;
    const totalDuration = Math.max(1, snippet.durationSec);
    const montagePlan = await buildMontagePlan({
      clipPaths,
      totalDuration,
      minDur,
      maxDur,
      requireFirstCut: rules.viral_engine.require_montage_first_cut
    });
    await renderMontage({
      clipPaths: montagePlan.clipPaths,
      audioPath,
      outputPath,
      onscreenText,
      concatFilePath,
      clipDurations: montagePlan.durations
    });
  } else {
    await renderStatic({
      clipPaths,
      audioPath,
      outputPath,
      onscreenText
    });
  }

  const buffer = await readFile(outputPath);
  const renderHash = createHash("sha256").update(buffer).digest("hex");

  await prisma.postPlan.update({
    where: { id: postPlanId },
    data: { status: "RENDERED", renderPath: outputPath, renderHash }
  });

  return { outputPath };
}
