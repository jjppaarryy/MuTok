import { prisma } from "./prisma";
import { getAnalyticsSummary } from "./analytics";
import { getRulesSettings } from "./settings";
import { getConfig } from "./config";
import { ensureHookRecipes } from "./hookRecipes";

export type BrainRunContext = {
  openAiApiKey?: string;
  settings: Awaited<ReturnType<typeof getRulesSettings>>;
  clips: Awaited<ReturnType<typeof prisma.clip.findMany>>;
  snippets: Awaited<ReturnType<typeof prisma.snippet.findMany>>;
  queueState: Awaited<ReturnType<typeof prisma.postPlan.findMany>>;
  metricsSummary: Awaited<ReturnType<typeof getAnalyticsSummary>>;
  brainSetting: Awaited<ReturnType<typeof prisma.setting.findUnique>>;
  armStats: Awaited<ReturnType<typeof prisma.armStats.findMany>>;
  hookRecipes: Awaited<ReturnType<typeof prisma.hookRecipe.findMany>>;
  ctas: Awaited<ReturnType<typeof prisma.cta.findMany>>;
  metrics: Awaited<ReturnType<typeof prisma.metric.findMany>>;
  voiceBankLines: string[];
};

export async function loadBrainContext(): Promise<BrainRunContext> {
  const openAiApiKey = await getConfig("OPENAI_API_KEY");
  const settings = await getRulesSettings();
  await ensureHookRecipes();
  const [
    clips,
    snippets,
    queueState,
    metricsSummary,
    brainSetting,
    armStats,
    hookRecipes,
    ctas,
    metrics,
    voiceBankLines
  ] = await Promise.all([
    prisma.clip.findMany(),
    prisma.snippet.findMany({ where: { approved: true } }),
    prisma.postPlan.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    getAnalyticsSummary(),
    prisma.setting.findUnique({ where: { key: "brain" } }),
    prisma.armStats.findMany(),
    prisma.hookRecipe.findMany(),
    prisma.cta.findMany(),
    prisma.metric.findMany({
      where: { rewardScore: { not: null } },
      orderBy: { rewardScore: "desc" },
      take: 5
    }),
    Promise.resolve([])
  ]);

  return {
    openAiApiKey,
    settings,
    clips,
    snippets,
    queueState,
    metricsSummary,
    brainSetting,
    armStats,
    hookRecipes,
    ctas,
    metrics,
    voiceBankLines
  };
}
