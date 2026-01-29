import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { ensureHookFamilies } from "../../../lib/hookFamilies";

export async function GET() {
  await ensureHookFamilies();
  const families = await prisma.hookFamily.findMany({
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ families });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as {
    families: Array<{
      id: string;
      name: string;
      enabled: boolean;
      templates: unknown;
    }>;
  };

  const updates = body.families ?? [];

  for (const family of updates) {
    await prisma.hookFamily.update({
      where: { id: family.id },
      data: {
        name: family.name,
        enabled: family.enabled,
        templates: family.templates as Prisma.InputJsonValue
      }
    });
  }

  const families = await prisma.hookFamily.findMany({
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ families });
}
