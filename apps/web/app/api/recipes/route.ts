import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

type RecipeInput = {
  name?: string;
  beat1Text?: string;
  beat2Text?: string;
  captionText?: string;
  ctaType?: string;
  allowedSnippetTypes?: string[];
  containerAllowed?: "static_daw" | "montage" | "both";
  enabled?: boolean;
};

const resolveDisallowedContainers = (allowed?: RecipeInput["containerAllowed"]) => {
  if (!allowed || allowed === "both") return [];
  return allowed === "static_daw" ? ["montage"] : ["static_daw"];
};

const toTemplateArray = (text?: string) => {
  const value = (text ?? "").trim();
  return value ? [value] : [];
};

export async function GET() {
  const recipes = await prisma.hookRecipe.findMany({
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ recipes });
}

export async function POST(request: Request) {
  const body = (await request.json()) as RecipeInput;
  const name = body.name?.trim();
  const beat1Templates = toTemplateArray(body.beat1Text);
  const beat2Templates = toTemplateArray(body.beat2Text);
  if (!name || beat1Templates.length === 0 || beat2Templates.length === 0) {
    return NextResponse.json(
      { error: "name, beat1Text, and beat2Text are required" },
      { status: 400 }
    );
  }
  const recipe = await prisma.hookRecipe.create({
    data: {
      name,
      enabled: body.enabled ?? true,
      locked: false,
      beat1Templates,
      beat2Templates,
      captionTemplate: body.captionText?.trim() ?? null,
      ctaType: body.ctaType ?? "KEEP_SKIP",
      allowedSnippetTypes: body.allowedSnippetTypes ?? [],
      disallowedContainers: resolveDisallowedContainers(body.containerAllowed),
      source: "manual"
    }
  });
  return NextResponse.json({ recipe });
}
