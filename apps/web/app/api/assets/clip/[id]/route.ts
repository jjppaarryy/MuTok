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
    sync?: string;
    clipSetIds?: string[] | null;
  };

  const updated = await prisma.$transaction(async (tx) => {
    const clip = await tx.clip.update({
      where: { id },
      data: {
        category: body.category,
        sync: body.sync
      }
    });

    if (body.clipSetIds) {
      await tx.clipSetItem.deleteMany({ where: { clipId: id } });
      if (body.clipSetIds.length > 0) {
        await tx.clipSetItem.createMany({
          data: body.clipSetIds.map((clipSetId) => ({ clipId: id, clipSetId }))
        });
      }
    }

    return clip;
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
