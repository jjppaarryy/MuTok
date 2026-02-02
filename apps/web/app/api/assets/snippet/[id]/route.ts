import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    approved?: boolean;
    section?: string | null;
  };

  const updates: {
    approved?: boolean;
    section?: string | null;
  } = {};

  if (typeof body.approved === "boolean") updates.approved = body.approved;
  if (typeof body.section === "string" || body.section === null) updates.section = body.section;

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
