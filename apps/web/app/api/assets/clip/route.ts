import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { prisma } from "../../../../lib/prisma";
import { saveFile } from "../../../../lib/storage";
import { resolveFfprobe } from "../../../../lib/ffmpegRender";

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
          console.warn(`[clip upload] FFprobe failed for ${filePath}:`, error.message);
          resolve(null);
          return;
        }
        const duration = Number.parseFloat(stdout.trim());
        resolve(Number.isFinite(duration) ? duration : null);
      }
    );
  });

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const category = String(form.get("category") ?? "neutral");
  const sync = String(form.get("sync") ?? "safe") as
    | "safe"
    | "sensitive"
    | "critical";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = await saveFile(buffer, "clips", file.name);

  const durationSec = (await getDurationSec(filePath)) ?? 0;
  const clip = await prisma.clip.create({
    data: {
      filePath,
      category,
      sync,
      durationSec
    }
  });

  return NextResponse.json({ clip });
}

export async function GET() {
  const clips = await prisma.clip.findMany({
    include: { clipSetItems: { include: { clipSet: true } } },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ clips });
}
