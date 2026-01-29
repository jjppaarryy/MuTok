import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { deleteFile } from "../../../../../lib/storage";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    category?: string;
    energy?: number;
    motion?: string;
    sync?: string;
    vibe?: string;
  };

  const updated = await prisma.clip.update({
    where: { id },
    data: {
      category: body.category,
      energy: body.energy,
      motion: body.motion,
      sync: body.sync,
      vibe: body.vibe
    }
  });

  return NextResponse.json({ clip: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const clip = await prisma.clip.findUnique({ where: { id } });

  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  await prisma.clip.delete({ where: { id } });
  if (clip.filePath) {
    await deleteFile(clip.filePath);
  }

  return NextResponse.json({ ok: true });
}
