import { spawn } from "child_process";
import { existsSync, writeFileSync, unlinkSync } from "fs";
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
  targetDurationSec?: number;
};

export type TextOverlaySettings = {
  font_size: number;
  margin_x: number;
  margin_top: number;
  box_opacity: number;
  box_padding: number;
  beat1_duration: number;
  beat2_duration: number;
};

const defaultTextSettings: TextOverlaySettings = {
  font_size: 58,
  margin_x: 100,
  margin_top: 120,
  box_opacity: 0.6,
  box_padding: 15,
  beat1_duration: 2,
  beat2_duration: 3
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

// Generate an ASS subtitle file for beat overlays.
const generateAssFile = (
  text: string,
  outputPath: string,
  fontPath: string,
  settings: TextOverlaySettings
): string => {
  const assPath = outputPath.replace(/\.[^.]+$/, ".ass");
  const beats = text.split("\n").map((l) => l.trim()).filter(Boolean);
  
  // Extract font name from path (e.g., "Outfit" from "Outfit-VariableFont_wght.ttf")
  const fontName = path.basename(fontPath).replace(/[-_].*$/, "").replace(/\.[^.]+$/, "") || "Arial";
  
  // Calculate box opacity as hex (0-255)
  const boxAlpha = Math.round((1 - settings.box_opacity) * 255).toString(16).padStart(2, "0").toUpperCase();
  
  // ASS uses &HAABBGGRR format for colors (Alpha, Blue, Green, Red)
  // White text: &H00FFFFFF, Black background with opacity
  const primaryColor = "&H00FFFFFF"; // White
  const backColor = `&H${boxAlpha}000000`; // Black with opacity
  
  // Build timing for each beat
  const dialogues: string[] = [];
  let currentTime = 0;
  
  beats.forEach((beat, i) => {
    const duration = i === 0 ? settings.beat1_duration : settings.beat2_duration;
    const startTime = formatAssTime(currentTime);
    const endTime = formatAssTime(currentTime + duration);
    
    // Escape special ASS characters
    const escapedBeat = beat.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
    
    dialogues.push(`Dialogue: 0,${startTime},${endTime},Beat,,0,0,0,,${escapedBeat}`);
    currentTime += duration;
  });
  
  const assContent = `[Script Info]
Title: Beat Overlay
ScriptType: v4.00+
WrapStyle: 1
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Beat,${fontName},${settings.font_size},${primaryColor},${primaryColor},${backColor},${backColor},1,0,0,0,100,100,0,0,4,${settings.box_padding},${settings.box_padding},8,${settings.margin_x},${settings.margin_x},${settings.margin_top},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogues.join("\n")}
`;

  writeFileSync(assPath, assContent, "utf-8");
  console.log(`[ffmpegRender] Generated ASS file: ${assPath}`);
  return assPath;
};

const formatAssTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
};

const run = (args: string[]): Promise<void> => {
  const ffmpegPath = resolveFfmpeg();
  console.log(`[ffmpegRender] Command: ${ffmpegPath} ${args.join(" ")}`);
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stdout.on("data", () => {});
    proc.stderr.on("data", (c) => { stderr += c.toString(); });
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

const cleanupAssFile = (assPath: string) => {
  try {
    if (existsSync(assPath)) unlinkSync(assPath);
  } catch {
    // Ignore cleanup errors
  }
};

export async function renderStatic(input: RenderInput, textSettings?: TextOverlaySettings) {
  const settings = { ...defaultTextSettings, ...textSettings };
  const [clipPath] = input.clipPaths;
  console.log(`[renderStatic] Clip: ${clipPath}`);
  console.log(`[renderStatic] Text: "${input.onscreenText}"`);

  const baseFilters = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    "setsar=1"
  ];

  const font = input.fontPath ?? resolveFont();
  let assPath: string | null = null;
  let filters = baseFilters.join(",");

  // Generate ASS subtitle if we have text and font
  if (font && input.onscreenText?.trim()) {
    assPath = generateAssFile(input.onscreenText, input.outputPath, font, settings);
    // Escape the path for ffmpeg filter
    const escapedAssPath = assPath.replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
    filters = `${baseFilters.join(",")},ass='${escapedAssPath}'`;
  }

  const args = [
    "-y",
    ...(input.targetDurationSec ? ["-stream_loop", "-1"] : []),
    "-i", clipPath,
    "-i", input.audioPath,
    "-shortest", "-map", "0:v:0", "-map", "1:a:0",
    "-vf", filters,
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
    ...(input.targetDurationSec ? ["-t", String(input.targetDurationSec)] : []),
    input.outputPath
  ];

  try {
    await run(args);
  } catch (e) {
    console.warn("[renderStatic] Retrying without text");
    if (assPath) cleanupAssFile(assPath);
    args[args.indexOf("-vf") + 1] = baseFilters.join(",");
    await run(args);
  } finally {
    if (assPath) cleanupAssFile(assPath);
  }
}

export async function renderMontage(input: RenderInput, textSettings?: TextOverlaySettings) {
  const settings = { ...defaultTextSettings, ...textSettings };
  console.log(`[renderMontage] ${input.clipPaths.length} clips`);
  console.log(`[renderMontage] Text: "${input.onscreenText}"`);

  const durations = input.clipDurations ?? [];
  const inputArgs: string[] = ["-y"];

  for (const clipPath of input.clipPaths) {
    inputArgs.push("-i", clipPath);
  }
  inputArgs.push("-i", input.audioPath);

  // Build filter_complex: scale/crop each clip, then concat
  const filterParts: string[] = [];

  for (let i = 0; i < input.clipPaths.length; i++) {
    filterParts.push(
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v${i}]`
    );
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

  const font = input.fontPath ?? resolveFont();
  let assPath: string | null = null;

  // Generate ASS and apply after concat
  if (font && input.onscreenText?.trim()) {
    assPath = generateAssFile(input.onscreenText, input.outputPath, font, settings);
    const escapedAssPath = assPath.replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
    filterParts.push(`${concatInputs.join("")}concat=n=${input.clipPaths.length}:v=1:a=0,ass='${escapedAssPath}'[vout]`);
  } else {
    filterParts.push(`${concatInputs.join("")}concat=n=${input.clipPaths.length}:v=1:a=0[vout]`);
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
    if (assPath) cleanupAssFile(assPath);
    // Rebuild filter without ASS
    const noTextParts = filterParts.slice(0, -1);
    noTextParts.push(`${concatInputs.join("")}concat=n=${input.clipPaths.length}:v=1:a=0[vout]`);
    args[args.indexOf("-filter_complex") + 1] = noTextParts.join(";");
    await run(args);
  } finally {
    if (assPath) cleanupAssFile(assPath);
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
