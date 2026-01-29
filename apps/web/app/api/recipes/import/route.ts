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
  const body = (await request.json()) as { recipes?: ImportRecipe[] };
  const recipes = body.recipes ?? [];
  if (recipes.length === 0) {
    return NextResponse.json({ error: "No recipes provided" }, { status: 400 });
  }

  const created: string[] = [];
  for (const recipe of recipes) {
    if (!recipe.name || !recipe.beat1Text || !recipe.beat2Text) {
      continue;
    }
    const row = await prisma.hookRecipe.create({
      data: {
        name: recipe.name.trim(),
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

  return NextResponse.json({ created });
}
