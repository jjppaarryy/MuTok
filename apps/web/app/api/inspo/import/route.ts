import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { normalizeInspoItem, parseInspoPayload } from "../../../../lib/inspo";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const items = parseInspoPayload(payload);
  const errors: Array<{ index: number; error: string }> = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const [index, raw] of items.entries()) {
    const normalized = normalizeInspoItem(raw);
    if (!normalized.source) {
      skipped += 1;
      errors.push({ index, error: "Missing source" });
      continue;
    }

    const createdTime = normalized.createdTime ? new Date(normalized.createdTime) : null;
    const data = {
      source: normalized.source,
      sourceId: normalized.sourceId,
      title: normalized.title ?? null,
      contentType: normalized.contentType,
      assetType: normalized.assetType,
      linkOriginal: normalized.linkOriginal,
      copyRewrite: normalized.copyRewrite,
      whyItWorks: normalized.whyItWorks,
      description: normalized.description,
      howToUse: normalized.howToUse,
      themeTags: normalized.themeTags.length ? normalized.themeTags : null,
      purposeTags: normalized.purposeTags.length ? normalized.purposeTags : null,
      genreTags: normalized.genreTags.length ? normalized.genreTags : null,
      hashtags: normalized.hashtags.length ? normalized.hashtags : null,
      stats: normalized.stats,
      createdTime: createdTime && !Number.isNaN(createdTime.getTime()) ? createdTime : null,
      seedPatterns: normalized.seedPatterns.length ? normalized.seedPatterns : null
    };

    try {
      if (normalized.sourceId) {
        const existing = await prisma.inspoItem.findFirst({
          where: { source: normalized.source, sourceId: normalized.sourceId }
        });
        if (existing) {
          await prisma.inspoItem.update({ where: { id: existing.id }, data });
          updated += 1;
          continue;
        }
      }
      await prisma.inspoItem.create({ data });
      imported += 1;
    } catch (error) {
      skipped += 1;
      errors.push({ index, error: (error as Error).message });
    }
  }

  await prisma.inspoImportLog.create({
    data: {
      source: items[0]?.source ?? null,
      rawJson: payload ?? {},
      imported,
      skipped,
      errors
    }
  });

  return NextResponse.json({ imported, updated, skipped, errors });
}
