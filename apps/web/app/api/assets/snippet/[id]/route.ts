import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    approved?: boolean;
    energy?: number | null;
    section?: string | null;
    vibe?: string | null;
  };

  const updates: {
    approved?: boolean;
    energy?: number | null;
    section?: string | null;
    vibe?: string | null;
  } = {};

  if (typeof body.approved === "boolean") updates.approved = body.approved;
  if (typeof body.energy === "number" || body.energy === null) updates.energy = body.energy;
  if (typeof body.section === "string" || body.section === null) updates.section = body.section;
  if (typeof body.vibe === "string" || body.vibe === null) updates.vibe = body.vibe;

  const snippet = await prisma.snippet.update({
    where: { id },
    data: updates
  });

  return NextResponse.json({ snippet });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.snippet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
