import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

type ImportRecipe = {
  name: string;
  beat1Text: string;
  beat2Text: string;
  captionText?: string;
  ctaType?: string;
  allowedSnippetTypes?: string[];
  containerAllowed?: "static_daw" | "montage" | "both";
  enabled?: boolean;
};

const resolveDisallowedContainers = (allowed?: ImportRecipe["containerAllowed"]) => {
  if (!allowed || allowed === "both") return [];
  return allowed === "static_daw" ? ["montage"] : ["static_daw"];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { recipes?: ImportRecipe[] };
    const recipes = body.recipes ?? [];
    if (recipes.length === 0) {
      return NextResponse.json({ error: "No recipes provided" }, { status: 400 });
    }

    const created: string[] = [];
    const skipped: string[] = [];
    for (const recipe of recipes) {
      if (!recipe.name || !recipe.beat1Text || !recipe.beat2Text) {
        skipped.push(recipe.name ?? "Unknown");
        continue;
      }
      const name = recipe.name.trim();
      const existing = await prisma.hookRecipe.findUnique({ where: { name } });
      if (existing) {
        skipped.push(name);
        continue;
      }
      const row = await prisma.hookRecipe.create({
        data: {
          name,
          enabled: recipe.enabled ?? true,
          locked: false,
          beat1Templates: [recipe.beat1Text.trim()],
          beat2Templates: [recipe.beat2Text.trim()],
          captionTemplate: recipe.captionText?.trim() ?? null,
          ctaType: recipe.ctaType ?? "KEEP_SKIP",
          allowedSnippetTypes: recipe.allowedSnippetTypes ?? [],
          disallowedContainers: resolveDisallowedContainers(recipe.containerAllowed),
          source: "import"
        }
      });
      created.push(row.id);
    }

    return NextResponse.json({ created, skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
