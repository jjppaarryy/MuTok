import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

type SegmentEnergy = {
  meanDb: number;
  maxDb: number;
};

/**
 * Resolves the FFmpeg binary path across different platforms
 */
const resolveFfmpegPath = (): string => {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  const platform = process.platform;
  const candidatePaths: string[] = [];

  if (platform === "darwin") {
    candidatePaths.push(
      "/opt/homebrew/bin/ffmpeg",
      "/opt/homebrew/opt/ffmpeg/bin/ffmpeg",
      "/usr/local/bin/ffmpeg"
    );
  } else if (platform === "win32") {
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    candidatePaths.push(
      path.join(programFiles, "ffmpeg", "bin", "ffmpeg.exe"),
      "C:\\ffmpeg\\bin\\ffmpeg.exe"
    );
  } else {
    candidatePaths.push("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg");
  }

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return "ffmpeg";
};

const parseDbValue = (line: string, key: string) => {
  const match = line.match(new RegExp(`${key}:\\s*(-?[0-9.]+)\\s*dB`));
  return match ? Number(match[1]) : null;
};

export async function measureSegmentEnergy(params: {
  inputPath: string;
  startSec: number;
  durationSec: number;
}): Promise<SegmentEnergy> {
  const args = [
    "-y",
    "-ss",
    String(params.startSec),
    "-t",
    String(params.durationSec),
    "-i",
    params.inputPath,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-"
  ];

  const ffmpegPath = resolveFfmpegPath();

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (error) => {
      console.error("FFmpeg spawn error:", error);
      reject(new Error(`Failed to spawn ffmpeg: ${error.message}`));
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        console.error("FFmpeg volumedetect failed with code:", code);
        console.error("FFmpeg stderr:", stderr.slice(-500));
        reject(new Error(`ffmpeg volumedetect failed with code ${code}`));
        return;
      }
      const lines = stderr.split("\n");
      const mean = lines
        .map((line) => parseDbValue(line, "mean_volume"))
        .find((value) => value !== null);
      const max = lines
        .map((line) => parseDbValue(line, "max_volume"))
        .find((value) => value !== null);
      resolve({
        meanDb: mean ?? -40,
        maxDb: max ?? -20
      });
    });
  });
}

export function toEnergyScore(meanDb: number, maxDb: number) {
  const normalized = Math.min(1, Math.max(0, (meanDb + 35) / 23));
  let score = 1 + normalized * 4;
  if (maxDb > -1) {
    score += 1;
  } else if (maxDb > -6) {
    score += 0.5;
  }
  return Math.min(5, Math.max(1, Math.round(score)));
}

export function hasMoment(meanDb: number, maxDb: number) {
  const score = toEnergyScore(meanDb, maxDb);
  return score >= 4;
}
