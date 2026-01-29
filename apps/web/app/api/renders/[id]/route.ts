import { NextRequest } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { readFile } from "fs/promises";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const plan = await prisma.postPlan.findUnique({
    where: { id }
  });

  if (!plan?.renderPath) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await readFile(plan.renderPath);
  return new Response(buffer, {
    headers: {
      "Content-Type": "video/mp4"
    }
  });
}
