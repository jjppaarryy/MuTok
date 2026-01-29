import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { ensureDefaultCtas } from "../../../lib/optimizer";

export async function GET() {
  await ensureDefaultCtas();
  const ctas = await prisma.cta.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ctas });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    ctas: Array<{ id: string; locked: boolean; status: string }>;
  };
  for (const cta of body.ctas ?? []) {
    await prisma.cta.update({
      where: { id: cta.id },
      data: { locked: cta.locked, status: cta.status }
    });
  }
  const ctas = await prisma.cta.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ctas });
}
