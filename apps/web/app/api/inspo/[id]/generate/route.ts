import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { buildSeedPatternsFromCopy } from "../../../../../lib/inspo";
import {
  buildSeedPatternsFromVariants,
  generateInspoVariants
} from "../../../../../lib/inspoGenerator";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const item = await prisma.inspoItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { count?: number };
  const count = Math.min(8, Math.max(2, Number(body.count ?? 4)));
  const context = {
    title: item.title ?? item.description ?? undefined,
    copy: item.copyRewrite ?? undefined,
    description: item.description ?? undefined,
    whyItWorks: item.whyItWorks ?? undefined,
    howToUse: item.howToUse ?? undefined,
    purposeTags: Array.isArray(item.purposeTags) ? (item.purposeTags as string[]) : undefined,
    themeTags: Array.isArray(item.themeTags) ? (item.themeTags as string[]) : undefined,
    genreTags: Array.isArray(item.genreTags) ? (item.genreTags as string[]) : undefined
  };

  const llmVariants = await generateInspoVariants(context, count);
  const generated = llmVariants.length
    ? buildSeedPatternsFromVariants(llmVariants)
    : buildSeedPatternsFromCopy({
        title: item.title ?? item.description ?? undefined,
        copy: item.copyRewrite ?? undefined,
        purposeTags: Array.isArray(item.purposeTags)
          ? (item.purposeTags as string[])
          : undefined,
        themeTags: Array.isArray(item.themeTags) ? (item.themeTags as string[]) : undefined,
        purpose: Array.isArray(item.purposeTags) ? (item.purposeTags as string[])?.[0] : undefined,
        theme: Array.isArray(item.themeTags) ? (item.themeTags as string[])?.[0] : undefined,
        how_to_use: item.howToUse ?? undefined
      });

  const updated = await prisma.inspoItem.update({
    where: { id: item.id },
    data: {
      seedPatterns: generated.length ? generated : null
    }
  });

  return NextResponse.json({ item: updated });
}
