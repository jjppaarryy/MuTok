import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const getArrayParam = (value: string | null) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];

const getStatValue = (stats: unknown, key: "views" | "likes") => {
  if (!stats || typeof stats !== "object") return 0;
  const value = (stats as Record<string, number | null>)[key];
  return typeof value === "number" ? value : 0;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const assetType = url.searchParams.get("assetType");
  const contentType = url.searchParams.get("contentType");
  const purposeTags = getArrayParam(url.searchParams.get("purpose"));
  const themeTags = getArrayParam(url.searchParams.get("theme"));
  const mechanic = url.searchParams.get("mechanic")?.trim();
  const sort = url.searchParams.get("sort") ?? "recent";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));

  const where = {
    ...(assetType ? { assetType } : {}),
    ...(contentType ? { contentType } : {}),
    ...(search
      ? {
          OR: [
            { sourceId: { contains: search } },
            { title: { contains: search } },
            { copyRewrite: { contains: search } },
            { description: { contains: search } },
            { whyItWorks: { contains: search } },
            { howToUse: { contains: search } }
          ]
        }
      : {})
  };

  const items = await prisma.inspoItem.findMany({ where });
  const filtered = items.filter((item) => {
    const themes = Array.isArray(item.themeTags) ? (item.themeTags as string[]) : [];
    const purposes = Array.isArray(item.purposeTags) ? (item.purposeTags as string[]) : [];
    const seedPatterns = Array.isArray(item.seedPatterns)
      ? (item.seedPatterns as Array<{ core_mechanic?: string }>)
      : [];
    if (themeTags.length > 0 && !themeTags.some((tag) => themes.includes(tag))) return false;
    if (purposeTags.length > 0 && !purposeTags.some((tag) => purposes.includes(tag))) return false;
    if (mechanic) {
      const hasMechanic = seedPatterns.some((pattern) =>
        pattern.core_mechanic?.toLowerCase().includes(mechanic.toLowerCase())
      );
      if (!hasMechanic) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "views") return getStatValue(b.stats, "views") - getStatValue(a.stats, "views");
    if (sort === "likes") return getStatValue(b.stats, "likes") - getStatValue(a.stats, "likes");
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  return NextResponse.json({ items: paged, page, pageSize, total });
}
