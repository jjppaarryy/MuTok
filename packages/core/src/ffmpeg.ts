import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

const resolveFfmpeg = (): string => {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const paths = process.platform === "darwin"
    ? [
        "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg"
      ]
    : process.platform === "win32"
    ? ["C:\\ffmpeg\\bin\\ffmpeg.exe"]
    : ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
  
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return "ffmpeg";
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
  return text.replace(/\\/g, "\\\\\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
};

const resolveFont = (): string | null => {
  const fonts = process.platform === "darwin"
    ? [
        "/Users/jamesparry-jones/Library/Fonts/Outfit-VariableFont_wght.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Arial.ttf"
      ]
    : process.platform === "win32"
    ? ["C:\\Windows\\Fonts\\arialbd.ttf", "C:\\Windows\\Fonts\\arial.ttf"]
    : ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"];
  for (const f of fonts) { if (existsSync(f)) return f; }
  return null;
};

const run = (args: string[]): Promise<void> => {
  console.log(`[FFmpeg] Running ffmpeg...`);
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveFfmpeg(), args, { stdio: ["ignore", "inherit", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (c) => { stderr += c.toString(); process.stderr.write(c); });
    proc.on("error", reject);
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}\n${stderr.slice(-500)}`)));
  });
};

const buildTextFilter = (text: string, fontPath?: string): string => {
  const font = fontPath ?? resolveFont();
  if (!font || !text?.trim()) return "";
  
  const fontEsc = font.replace(/:/g, "\\:").replace(/'/g, "\\'");
  const lines = text.split("\n").map(l => escapeDrawtext(l.trim())).filter(Boolean);
  
  if (lines.length >= 2) {
    return [
      `drawtext=text='${lines[0]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:enable='between(t,0,2)':fix_bounds=1`,
      `drawtext=text='${lines[1]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:enable='between(t,2,5)':fix_bounds=1`
    ].join(",");
  } else if (lines.length === 1) {
    return `drawtext=text='${lines[0]}':fontfile='${fontEsc}':fontsize=62:fontcolor=white:x=max(60\\,(w-text_w)/2):y=120:box=1:boxcolor=black@0.6:boxborderw=20:fix_bounds=1`;
  }
  return "";
};

export async function renderStatic(input: RenderInput) {
  const [clipPath] = input.clipPaths;
  const filters = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    "setsar=1"
  ];
  
  const textFilter = buildTextFilter(input.onscreenText, input.fontPath);
  if (textFilter) filters.push(textFilter);
  
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
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("drawtext") || msg.includes("font")) {
      console.warn("[renderStatic] Text failed, retrying without");
      const baseFilters = ["scale=1080:1920:force_original_aspect_ratio=increase", "crop=1080:1920", "setsar=1"];
      args[args.indexOf("-vf") + 1] = baseFilters.join(",");
      await run(args);
    } else throw e;
  }
}

export async function renderMontage(input: RenderInput) {
  const durations = input.clipDurations ?? [];
  const inputArgs: string[] = ["-y"];
  for (const clipPath of input.clipPaths) { inputArgs.push("-i", clipPath); }
  inputArgs.push("-i", input.audioPath);
  
  const filterParts: string[] = [];
  for (let i = 0; i < input.clipPaths.length; i++) {
    filterParts.push(`[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v${i}]`);
  }
  
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
  
  const textFilter = buildTextFilter(input.onscreenText, input.fontPath);
  if (textFilter) {
    filterParts.push(`[vconcat]${textFilter}[vout]`);
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
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("drawtext") || msg.includes("font")) {
      console.warn("[renderMontage] Text failed, retrying without");
      const noTextParts = filterParts.slice(0, -1);
      noTextParts.push(`[vconcat]null[vout]`);
      args[args.indexOf("-filter_complex") + 1] = noTextParts.join(";");
      await run(args);
    } else throw e;
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
