import { prisma } from "./prisma";

const defaultRecipes = [
  {
    name: "Early access",
    beat1Templates: ["You’re early. Unreleased."],
    beat2Templates: ["Wait for 0:06."],
    ctaType: "FOLLOW_FULL",
    allowedSnippetTypes: ["moment_3_7", "moment_7_11"],
    disallowedContainers: []
  },
  {
    name: "Binary judgement",
    beat1Templates: ["KEEP or SKIP?"],
    beat2Templates: ["Be brutal at 0:07."],
    ctaType: "KEEP_SKIP",
    allowedSnippetTypes: ["moment_3_7"],
    disallowedContainers: []
  },
  {
    name: "Timestamp lure",
    beat1Templates: ["Wait for 0:06."],
    beat2Templates: ["Did you catch it?"],
    ctaType: "COMMENT_VIBE",
    allowedSnippetTypes: ["moment_3_7", "moment_7_11"],
    disallowedContainers: []
  },
  {
    name: "Reference anchor",
    beat1Templates: ["If you like Anyma…"],
    beat2Templates: ["This drop is the test."],
    ctaType: "COMMENT_VIBE",
    allowedSnippetTypes: ["moment_3_7"],
    disallowedContainers: []
  },
  {
    name: "Open loop",
    beat1Templates: ["This sound is wrong on purpose."],
    beat2Templates: ["Guess what I made it with."],
    ctaType: "COMMENT_VIBE",
    allowedSnippetTypes: ["moment_3_7"],
    disallowedContainers: ["montage"]
  },
  {
    name: "Stakes",
    beat1Templates: ["If this flops, I bin it."],
    beat2Templates: ["Should I keep it?"],
    ctaType: "KEEP_SKIP",
    allowedSnippetTypes: ["moment_3_7"],
    disallowedContainers: []
  },
  {
    name: "Identity gate",
    beat1Templates: ["If you get it, you get it."],
    beat2Templates: ["Name this vibe."],
    ctaType: "COMMENT_VIBE",
    allowedSnippetTypes: ["moment_7_11"],
    disallowedContainers: []
  },
  {
    name: "Confession",
    beat1Templates: ["I might be overcooking this."],
    beat2Templates: ["Be honest at 0:07."],
    ctaType: "KEEP_SKIP",
    allowedSnippetTypes: [],
    disallowedContainers: []
  },
  {
    name: "Micro-challenge",
    beat1Templates: ["2 seconds. KEEP/SKIP."],
    beat2Templates: ["Don’t overthink it."],
    ctaType: "KEEP_SKIP",
    allowedSnippetTypes: ["moment_3_7"],
    disallowedContainers: []
  },
  {
    name: "Name it",
    beat1Templates: ["What do we call this?"],
    beat2Templates: ["Best name wins."],
    ctaType: "COMMENT_VIBE",
    allowedSnippetTypes: ["moment_7_11"],
    disallowedContainers: []
  }
];

export async function ensureHookRecipes() {
  const count = await prisma.hookRecipe.count();
  if (count > 0) return;
  await prisma.hookRecipe.createMany({
    data: defaultRecipes.map((recipe) => ({
      name: recipe.name,
      enabled: true,
      beat1Templates: recipe.beat1Templates,
      beat2Templates: recipe.beat2Templates,
      ctaType: recipe.ctaType,
      allowedSnippetTypes: recipe.allowedSnippetTypes,
      disallowedContainers: recipe.disallowedContainers
    }))
  });
}

export async function getEnabledHookRecipes() {
  await ensureHookRecipes();
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
