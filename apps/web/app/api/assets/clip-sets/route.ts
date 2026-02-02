import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const clipSets = await prisma.clipSet.findMany({
    include: { clipItems: true },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ clipSets });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name?: string };
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const clipSet = await prisma.clipSet.create({ data: { name } });
  return NextResponse.json({ clipSet });
}
