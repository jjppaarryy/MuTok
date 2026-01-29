import { spawn } from "child_process";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";

const resolveFfmpeg = (): string => {
  const paths = [
    "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg"
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return "ffmpeg";
};

export const resolveFfprobe = (): string => {
  const ffmpegPath = resolveFfmpeg();
  if (ffmpegPath !== "ffmpeg") {
    const probePath = path.join(path.dirname(ffmpegPath), "ffprobe");
    if (existsSync(probePath)) return probePath;
  }
  return "ffprobe";
};

export type RenderInput = {
  clipPaths: string[];
  audioPath: string;
  outputPath: string;
  onscreenText: string;
  fontPath?: string;
  concatFilePath?: string;
  clipDurations?: number[];
};

const escapeDrawtext = (text: string) => {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
};

const resolveFont = (): string | null => {
  const fonts = [
    "/Users/jamesparry-jones/Library/Fonts/Outfit-VariableFont_wght.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Arial.ttf",
    "/Library/Fonts/Arial Bold.ttf"
  ];
  for (const f of fonts) {
    if (existsSync(f)) return f;
  }
  return null;
};

const run = (args: string[]): Promise<void> => {
  const ffmpegPath = resolveFfmpeg();
  console.log(`[ffmpegRender] Command: ${ffmpegPath} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (c) => (stdout += c.toString()));
    proc.stderr.on("data", (c) => {
      stderr += c.toString();
      // process.stderr.write(c); // Quieter logs
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else {
        console.error(`[ffmpegRender] Error:\n${stderr}`);
        reject(new Error(`ffmpeg exit ${code}\n${stderr.slice(-1000)}`));
      }
    });
  });
};

export async function renderStatic(input: RenderInput) {
  const [clipPath] = input.clipPaths;
  console.log(`[renderStatic] Clip: ${clipPath}`);
  console.log(`[renderStatic] Text: "${input.onscreenText}"`);

  // Basic filters: scale + crop (portrait 1080x1920)
  const filters = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    "setsar=1"
  ];

  // Add text overlay
  const font = input.fontPath ?? resolveFont();
  console.log(`[ffmpegRender] Using font: ${font}`);
  if (font && input.onscreenText?.trim()) {
    const fontEsc = font.replace(/:/g, "\\:").replace(/'/g, "\\'");
    const lines = input.onscreenText.split("\n").map(l => escapeDrawtext(l.trim())).filter(Boolean);
    
    if (lines.length >= 2) {
      filters.push(
        `drawtext=text='${lines[0]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:enable='between(t,0,2)':fix_bounds=1`,
        `drawtext=text='${lines[1]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:enable='between(t,2,5)':fix_bounds=1`
      );
    } else if (lines.length === 1) {
      filters.push(
        `drawtext=text='${lines[0]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:fix_bounds=1`
      );
    }
  }

  const args = [
    "-y",
    "-i", clipPath,
    "-i", input.audioPath,
    "-shortest", "-map", "0:v:0", "-map", "1:a:0",
    "-vf", filters.join(","),
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
    input.outputPath
  ];

  try {
    await run(args);
  } catch (e) {
    console.warn("[renderStatic] Retrying without text");
    const baseFilters = ["scale=1080:1920:force_original_aspect_ratio=increase", "crop=1080:1920", "setsar=1"];
    args[args.indexOf("-vf") + 1] = baseFilters.join(",");
    await run(args);
  }
}

export async function renderMontage(input: RenderInput) {
  console.log(`[renderMontage] ${input.clipPaths.length} clips`);
  console.log(`[renderMontage] Text: "${input.onscreenText}"`);

  const durations = input.clipDurations ?? [];
  const inputArgs: string[] = ["-y"];

  // Add each clip (allow ffmpeg to handle auto-rotation from metadata)
  for (const clipPath of input.clipPaths) {
    inputArgs.push("-i", clipPath);
  }
  inputArgs.push("-i", input.audioPath);

  // Build complex filtergraph
  const filterParts: string[] = [];

  // Process each clip: scale + crop
  for (let i = 0; i < input.clipPaths.length; i++) {
    filterParts.push(
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v${i}]`
    );
  }

  // Trim each clip and concat
  const concatInputs: string[] = [];
  for (let i = 0; i < input.clipPaths.length; i++) {
    const dur = durations[i];
    if (dur) {
      filterParts.push(`[v${i}]trim=0:${dur.toFixed(2)},setpts=PTS-STARTPTS[vt${i}]`);
      concatInputs.push(`[vt${i}]`);
    } else {
      concatInputs.push(`[v${i}]`);
    }
  }

  filterParts.push(`${concatInputs.join("")}concat=n=${input.clipPaths.length}:v=1:a=0[vconcat]`);

  // Add text overlay
  const font = input.fontPath ?? resolveFont();
  console.log(`[ffmpegRender] Using font: ${font}`);
  if (font && input.onscreenText?.trim()) {
    const fontEsc = font.replace(/:/g, "\\:").replace(/'/g, "\\'");
    const lines = input.onscreenText.split("\n").map(l => escapeDrawtext(l.trim())).filter(Boolean);

    if (lines.length >= 2) {
      filterParts.push(
        `[vconcat]drawtext=text='${lines[0]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:enable='between(t,0,2)':fix_bounds=1,drawtext=text='${lines[1]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:enable='between(t,2,5)':fix_bounds=1[vout]`
      );
    } else if (lines.length === 1) {
      filterParts.push(
        `[vconcat]drawtext=text='${lines[0]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:fix_bounds=1[vout]`
      );
    } else {
      filterParts.push(`[vconcat]null[vout]`);
    }
  } else {
    filterParts.push(`[vconcat]null[vout]`);
  }

  const args = [
    ...inputArgs,
    "-filter_complex", filterParts.join(";"),
    "-map", "[vout]",
    "-map", `${input.clipPaths.length}:a:0`,
    "-shortest",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
    input.outputPath
  ];

  try {
    await run(args);
  } catch (e) {
    console.warn("[renderMontage] Retrying without text");
    const noTextParts = filterParts.slice(0, -1);
    noTextParts.push(`[vconcat]null[vout]`);
    args[args.indexOf("-filter_complex") + 1] = noTextParts.join(";");
    await run(args);
  }
}

export async function renderAudioSnippet(params: {
  inputPath: string;
  outputPath: string;
  startSec: number;
  durationSec: number;
}) {
  await run([
    "-y", "-ss", String(params.startSec), "-t", String(params.durationSec),
    "-i", params.inputPath,
    "-vn", "-ac", "2", "-ar", "44100", "-c:a", "aac", "-b:a", "192k",
    params.outputPath
  ]);
}
