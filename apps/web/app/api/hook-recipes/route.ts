import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { ensureHookRecipes } from "../../../lib/hookRecipes";

export async function GET() {
  await ensureHookRecipes();
  const recipes = await prisma.hookRecipe.findMany({
    orderBy: { name: "asc" },
    include: {
      variants: { orderBy: { createdAt: "desc" } }
    }
  });
  return NextResponse.json({ recipes });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    recipes: Array<{
      id: string;
      name: string;
      enabled: boolean;
      locked: boolean;
      beat1Templates: string[];
      beat2Templates: string[];
      captionTemplate?: string | null;
      ctaType: string;
      allowedSnippetTypes: string[];
      disallowedContainers: string[];
      variants?: Array<{ id: string; locked: boolean }>;
    }>;
  };

  for (const recipe of body.recipes ?? []) {
    await prisma.hookRecipe.update({
      where: { id: recipe.id },
      data: {
        name: recipe.name,
        enabled: recipe.enabled,
        locked: recipe.locked,
        beat1Templates: recipe.beat1Templates,
        beat2Templates: recipe.beat2Templates,
        captionTemplate: recipe.captionTemplate ?? null,
        ctaType: recipe.ctaType,
        allowedSnippetTypes: recipe.allowedSnippetTypes,
        disallowedContainers: recipe.disallowedContainers
      }
    });
    for (const variant of recipe.variants ?? []) {
      await prisma.variant.update({
        where: { id: variant.id },
        data: { locked: variant.locked }
      });
    }
  }

  const recipes = await prisma.hookRecipe.findMany({
    orderBy: { name: "asc" },
    include: {
      variants: { orderBy: { createdAt: "desc" } }
    }
  });
  return NextResponse.json({ recipes });
}
