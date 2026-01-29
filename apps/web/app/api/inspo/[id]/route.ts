import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const item = await prisma.inspoItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { favorite?: boolean };
  const updated = await prisma.inspoItem.update({
    where: { id },
    data: { favorite: Boolean(body.favorite) }
  });
  return NextResponse.json({ item: updated });
}
