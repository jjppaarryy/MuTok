import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { saveFile } from "../../../../lib/storage";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const category = String(form.get("category") ?? "DAW_screen");
  const energy = Number(form.get("energy") ?? 3);
  const motion = String(form.get("motion") ?? "med") as "low" | "med" | "high";
  const sync = String(form.get("sync") ?? "safe") as
    | "safe"
    | "sensitive"
    | "critical";
  const vibe = String(form.get("vibe") ?? "bright_clean");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = await saveFile(buffer, "clips", file.name);

  const clip = await prisma.clip.create({
    data: {
      filePath,
      category,
      energy,
      motion,
      sync,
      vibe,
      durationSec: 0
    }
  });

  return NextResponse.json({ clip });
}

export async function GET() {
  const clips = await prisma.clip.findMany({
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ clips });
}
