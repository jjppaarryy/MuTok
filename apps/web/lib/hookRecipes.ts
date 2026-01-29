import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";

type DefaultRecipe = {
  name: string;
  beat1Templates: string[];
  beat2Templates: string[];
  captionTemplate?: string;
  ctaType: string;
  allowedSnippetTypes: string[];
  disallowedContainers: string[];
};

const defaultRecipes: DefaultRecipe[] = [];

export async function ensureHookRecipes() {
  if (defaultRecipes.length === 0) return;
  for (const recipe of defaultRecipes) {
    await prisma.hookRecipe.create({
      data: {
        name: recipe.name,
        enabled: true,
        locked: false,
        beat1Templates: recipe.beat1Templates,
        beat2Templates: recipe.beat2Templates,
        captionTemplate: recipe.captionTemplate ?? null,
        ctaType: recipe.ctaType,
        allowedSnippetTypes: recipe.allowedSnippetTypes,
        disallowedContainers: recipe.disallowedContainers,
        source: "default"
      }
    });
  }
}

export async function getEnabledHookRecipes() {
  await ensureHookRecipes();
  const rules = await getRulesSettings();
  const hashtags = (rules.caption_hashtags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, rules.spam_guardrails.hashtag_count_max);
  const fallbackTopic = (rules.caption_topic_keywords ?? [])[0] ?? "";
  const defaultCaption = [fallbackTopic, hashtags.join(" ")].filter(Boolean).join(" ").trim();
  const missingCaptions = await prisma.hookRecipe.findMany({
    where: {
      enabled: true,
      OR: [
        { captionTemplate: null },
        { captionTemplate: "" },
        defaultCaption ? { captionTemplate: defaultCaption } : undefined
      ].filter(Boolean) as Array<{ captionTemplate?: string | null }>
    },
    select: { id: true, beat1Templates: true, name: true }
  });
  for (const recipe of missingCaptions) {
    const beat1 =
      Array.isArray(recipe.beat1Templates) && typeof recipe.beat1Templates[0] === "string"
        ? recipe.beat1Templates[0]
        : "";
    const lead = beat1.trim() || recipe.name || fallbackTopic;
    const caption = [lead, hashtags.join(" ")].filter(Boolean).join(" ").trim();
    if (!caption) continue;
    await prisma.hookRecipe.update({
      where: { id: recipe.id },
      data: { captionTemplate: caption }
    });
  }
  return prisma.hookRecipe.findMany({ where: { enabled: true } });
}

export async function getTopHookRecipes(limit = 2) {
  const metrics = await prisma.metric.findMany();
  const planIds = [...new Set(metrics.map((metric) => metric.postPlanId))];
  const plans = await prisma.postPlan.findMany({
    where: { id: { in: planIds } }
  });
  const planMap = new Map(plans.map((plan) => [plan.id, plan]));
  const scores = new Map<string, number>();
  for (const metric of metrics) {
    const plan = planMap.get(metric.postPlanId);
    if (!plan) continue;
    const retention = metric.views
      ? (metric.likes + metric.shares) / metric.views
      : 0;
    const interaction = metric.views ? metric.comments / metric.views : 0;
    const viralScore = retention * 0.6 + interaction * 0.4;
    scores.set(plan.hookFamily, (scores.get(plan.hookFamily) ?? 0) + viralScore);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}
