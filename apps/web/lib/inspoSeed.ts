import { prisma } from "./prisma";
import { ensureDefaultCtas } from "./optimizer";
import { removeGenderedLanguage } from "./inspo";
import { validateCtaRelevance } from "./relevanceValidator";

type SeedMode = "patterns" | "variants";

const intentMap: Record<string, string> = {
  binary_vote: "KEEP_SKIP",
  follow_for_id: "FOLLOW_FULL",
  comment_identity: "COMMENT_VIBE",
  save: "COMMENT_VIBE",
  dj_context: "COMMENT_VIBE",
  timestamp: "KEEP_SKIP"
};

const normalizeLine = (value: string) =>
  value.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();

const clampLine = (value: string) => normalizeLine(value);

const removeTimestampCta = (line: string) => {
  if (/timestamp/i.test(line)) return "KEEP or SKIP?";
  if (/\b0:\d{2}\b/.test(line)) return "KEEP or SKIP?";
  return line;
};

const mapCtaIntent = (intents: string[]) => {
  const candidate = intents.find((intent) => intentMap[intent]);
  return candidate ? intentMap[candidate] : "KEEP_SKIP";
};

const buildRecipeName = (base: string, sourceId?: string | null) => {
  const core = base.replace(/[_-]+/g, " ").trim() || "Seed";
  const suffix = sourceId ? ` ${sourceId}` : "";
  return `Inspo ${core}${suffix}`.trim();
};

export async function seedInspoItem(params: {
  inspoId: string;
  mode?: SeedMode;
}) {
  const item = await prisma.inspoItem.findUnique({ where: { id: params.inspoId } });
  if (!item) return { createdRecipeIds: [], createdVariantIds: [] };

  const patterns = Array.isArray(item.seedPatterns)
    ? (item.seedPatterns as Array<{
        core_mechanic?: string;
        hook_family?: string;
        cta_intents_allowed?: string[];
        music_first_variants?: Array<{
          beat1?: string;
          beat2?: string;
          caption?: string;
          notes?: string;
        }>;
      }>)
    : [];

  if (patterns.length === 0) {
    return { createdRecipeIds: [], createdVariantIds: [] };
  }

  await ensureDefaultCtas();
  const ctas = await prisma.cta.findMany();

  const createdRecipeIds: string[] = [];
  const createdVariantIds: string[] = [];

  for (const pattern of patterns) {
    const rawVariants = Array.isArray(pattern.music_first_variants)
      ? pattern.music_first_variants
      : [];
    const cleanedVariants = rawVariants
      .map((variant) => {
        const beat1Full = normalizeLine(removeGenderedLanguage(variant.beat1 ?? "") ?? "");
        const beat2Full = normalizeLine(removeGenderedLanguage(variant.beat2 ?? "") ?? "");
        const beat1 = clampLine(beat1Full);
        let beat2 = clampLine(beat2Full);
        beat2 = removeTimestampCta(beat2);
        const relevance = validateCtaRelevance({
          beat1,
          beat2,
          hookFamily: pattern.hook_family ?? "seed",
          comparisonMode: false,
          optionsCount: 1
        });
        const caption = removeGenderedLanguage(variant.caption ?? "") ?? undefined;
        return {
          beat1Full,
          beat2Full,
          beat1,
          beat2: relevance.beat2,
          caption,
          notes: variant.notes
        };
      })
      .filter((variant) => variant.beat1 && variant.beat2);

    if (cleanedVariants.length === 0) continue;

    const beat1Templates = Array.from(
      new Set(cleanedVariants.map((v) => v.beat1Full || v.beat1))
    );
    const beat2Templates = Array.from(
      new Set(cleanedVariants.map((v) => v.beat2Full || v.beat2))
    );
    const ctaType = mapCtaIntent(pattern.cta_intents_allowed ?? []);
    const ctaId = ctas.find((cta) => cta.intent === ctaType)?.id ?? null;

    let name = buildRecipeName(pattern.hook_family ?? pattern.core_mechanic ?? "Seed", item.sourceId);
    const existing = await prisma.hookRecipe.findUnique({ where: { name } });
    if (existing) {
      const suffix = Math.random().toString(36).slice(2, 6);
      name = `${name} ${suffix}`.trim();
    }

    const recipe = await prisma.hookRecipe.create({
      data: {
        name,
        enabled: true,
        locked: false,
        beat1Templates,
        beat2Templates,
        ctaType,
        allowedSnippetTypes: ["moment_3_7", "moment_7_11"],
        disallowedContainers: [],
        source: "inspo",
        inspoItemId: item.id
      }
    });

    createdRecipeIds.push(recipe.id);

    for (const variant of cleanedVariants) {
      const created = await prisma.variant.create({
        data: {
          recipeId: recipe.id,
          beat1: variant.beat1,
          beat2: variant.beat2,
          captionTemplate: variant.caption,
          ctaId,
          status: "testing",
          createdBy: "inspo",
          source: "inspo",
          inspoItemId: item.id
        }
      });
      createdVariantIds.push(created.id);
    }
  }

  return { createdRecipeIds, createdVariantIds };
}
