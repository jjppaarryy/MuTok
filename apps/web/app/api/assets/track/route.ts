import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { saveFile } from "../../../../lib/storage";
import { execFile } from "child_process";

const getDurationSec = (filePath: string) =>
  new Promise<number | null>((resolve) => {
    execFile(
      "ffprobe",
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
  const title = String(form.get("title") ?? "Untitled track");
  const bpm = form.get("bpm") ? Number(form.get("bpm")) : null;
  const key = form.get("key") ? String(form.get("key")) : null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = await saveFile(buffer, "tracks", file.name);
  const durationSec = await getDurationSec(filePath);

  const track = await prisma.track.create({
    data: {
      filePath,
      title,
      bpm: bpm ?? undefined,
      key: key ?? undefined,
      durationSec: durationSec ?? undefined
    }
  });

  return NextResponse.json({ track });
}

export async function GET() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
    include: { snippets: true }
  });
  for (const track of tracks) {
    if (track.durationSec == null && track.filePath) {
      const duration = await getDurationSec(track.filePath);
      if (duration != null) {
        await prisma.track.update({
          where: { id: track.id },
          data: { durationSec: duration }
        });
        track.durationSec = duration;
      }
    }
  }
  return NextResponse.json({ tracks });
}
