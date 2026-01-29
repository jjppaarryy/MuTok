import { defaultBrainSettings } from "./settings";
import { prisma } from "./prisma";
import { identifyWinners, getWinnerExamples, formatWinnersForPrompt } from "./winnerLearning";
import { BrainRunContext } from "./brainRunContext";

const buildBannedWords = (settings: BrainRunContext["settings"]) => [
  ...settings.guardrails.banned_phrases,
  ...settings.guardrails.banned_words,
  ...settings.voice_banned_words
];

export async function buildBrainPayload(context: BrainRunContext) {
  const { settings, armStats, hookRecipes, ctas, metrics, metricsSummary } = context;
  const recipeMap = new Map(hookRecipes.map((recipe) => [recipe.id, recipe]));
  const ctaMap = new Map(ctas.map((cta) => [cta.id, cta]));
  const priorMean = settings.optimiser_policy.prior_mean;
  const priorWeight = settings.optimiser_policy.prior_weight;
  const avgReward = (rewardSum: number, pulls: number) =>
    (rewardSum + priorMean * priorWeight) / Math.max(1, pulls + priorWeight);

  const top_hook_families = armStats
    .filter((row) => row.armType === "RECIPE")
    .map((row) => ({
      name: recipeMap.get(row.armId)?.name ?? row.armId,
      avg_reward: avgReward(row.rewardSum, row.pulls),
      sample_size: row.pulls
    }))
    .sort((a, b) => b.avg_reward - a.avg_reward)
    .slice(0, 5);

  const ctaIntentStats = new Map<string, { rewardSum: number; pulls: number }>();
  for (const row of armStats.filter((item) => item.armType === "CTA")) {
    const intent = ctaMap.get(row.armId)?.intent ?? "UNKNOWN";
    const current = ctaIntentStats.get(intent) ?? { rewardSum: 0, pulls: 0 };
    ctaIntentStats.set(intent, {
      rewardSum: current.rewardSum + row.rewardSum,
      pulls: current.pulls + row.pulls
    });
  }
  const top_cta_intents = [...ctaIntentStats.entries()]
    .map(([intent, value]) => ({
      intent,
      avg_reward: avgReward(value.rewardSum, value.pulls),
      sample_size: value.pulls
    }))
    .sort((a, b) => b.avg_reward - a.avg_reward)
    .slice(0, 5);

  const container_perf = armStats
    .filter((row) => row.armType === "CONTAINER")
    .map((row) => ({
      container: row.armId,
      avg_reward: avgReward(row.rewardSum, row.pulls),
      sample_size: row.pulls
    }))
    .sort((a, b) => b.avg_reward - a.avg_reward);

  await identifyWinners();
  const winners = await getWinnerExamples(10);
  const best_examples_detailed = formatWinnersForPrompt(winners);

  const planIds = metrics.map((row) => row.postPlanId);
  const plans = await prisma.postPlan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, onscreenText: true }
  });
  const planMap = new Map(plans.map((plan) => [plan.id, plan]));
  const best_examples = metrics.map((row) => ({
    post_id: row.postPlanId,
    onscreen_text: planMap.get(row.postPlanId)?.onscreenText ?? "",
    reward: row.rewardScore ?? 0
  }));

  const payload = {
    settings,
    clips: context.clips,
    snippets: context.snippets,
    metricsSummary,
    queueState: { recent: context.queueState },
    voice_bank_top_lines: context.voiceBankLines,
    hook_recipe_templates: hookRecipes
      .filter((recipe) => recipe.enabled)
      .map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        cta_type: recipe.ctaType,
        beat1_examples: (recipe.beat1Templates as string[]).slice(0, 10),
        beat2_examples: (recipe.beat2Templates as string[]).slice(0, 10)
      })),
    performance_summary: {
      top_hook_families,
      top_cta_intents,
      container_perf,
      phrases_to_avoid: buildBannedWords(settings),
      best_examples,
      best_examples_detailed,
      enabled_hook_families: hookRecipes
        .filter((recipe) => recipe.enabled)
        .map((recipe) => recipe.name)
    }
  };

  const systemPrompt =
    (context.brainSetting?.valueJson as { system_prompt?: string })?.system_prompt ??
    defaultBrainSettings.system_prompt;

  return { payload, systemPrompt };
}
