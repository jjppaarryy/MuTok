import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";
import { maybeMutateRecipe } from "./variantMutator";
import { maybeCreateNewArchetype } from "./archetypeMutator";

type Rules = Awaited<ReturnType<typeof getRulesSettings>>;

const posteriorMean = (rewardSum: number, pulls: number, rules: Rules) => {
  return (rewardSum + rules.optimiser_policy.prior_mean * rules.optimiser_policy.prior_weight) /
    Math.max(1, pulls + rules.optimiser_policy.prior_weight);
};

const UNDERPERFORMANCE_WINDOW_DAYS = 7;
const UNDERPERFORMANCE_MIN_SAMPLES = 6;
const UNDERPERFORMANCE_THRESHOLD_RATIO = 0.6;
const EXPLORATION_STEP = 0.1;
const EXPLORATION_MAX = 0.6;
const UNDERPERFORMANCE_STREAK_FOR_ACTION = 2;
const ACTION_COOLDOWN_HOURS = 24;

type OptimizerState = {
  underperformStreak?: number;
  lastActionAt?: string | null;
  lastArchetypeAt?: string | null;
};

const getOptimizerState = async (): Promise<OptimizerState> => {
  const stored = await prisma.setting.findUnique({ where: { key: "optimizer_state" } });
  return (stored?.valueJson as OptimizerState) ?? {};
};

const saveOptimizerState = async (state: OptimizerState) => {
  await prisma.setting.upsert({
    where: { key: "optimizer_state" },
    update: { valueJson: state },
    create: { key: "optimizer_state", valueJson: state }
  });
};

const hoursSince = (timestamp?: string | null) => {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return Number.POSITIVE_INFINITY;
  return (Date.now() - then) / (1000 * 60 * 60);
};

const isUnderperforming = async (rules: Rules) => {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - UNDERPERFORMANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  const metrics = await prisma.metric.findMany({
    where: {
      collectedAt: { gte: windowStart },
      views: { gte: rules.optimiser_policy.min_views_before_counting }
    },
    select: { rewardScore: true }
  });
  if (metrics.length < UNDERPERFORMANCE_MIN_SAMPLES) return false;
  const avg =
    metrics.reduce((sum, row) => sum + (row.rewardScore ?? 0), 0) / metrics.length;
  return avg <= rules.optimiser_policy.prior_mean * UNDERPERFORMANCE_THRESHOLD_RATIO;
};

const isPlateau = async (days: number) => {
  const now = new Date();
  const recentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const priorStart = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);
  const recent = await prisma.metric.findMany({
    where: { collectedAt: { gte: recentStart } },
    select: { rewardScore: true }
  });
  const prior = await prisma.metric.findMany({
    where: { collectedAt: { gte: priorStart, lt: recentStart } },
    select: { rewardScore: true }
  });
  const avg = (rows: typeof recent) =>
    rows.length ? rows.reduce((sum, row) => sum + (row.rewardScore ?? 0), 0) / rows.length : 0;
  if (recent.length < 3 || prior.length < 3) return false;
  return avg(recent) <= avg(prior);
};

const pickExplorationSeed = (
  recipeStats: Array<{ armId: string; rewardSum: number; pulls: number }>,
  recipes: Array<{ id: string; name: string; beat1Templates: unknown; beat2Templates: unknown }>,
  rules: Rules
) => {
  if (recipeStats.length === 0 || recipes.length === 0) {
    return recipes[Math.floor(Math.random() * recipes.length)] ?? null;
  }
  const scored = recipeStats
    .map((row) => ({
      id: row.armId,
      mean: posteriorMean(row.rewardSum, row.pulls, rules),
      pulls: row.pulls
    }))
    .sort((a, b) => a.mean - b.mean || a.pulls - b.pulls);
  const bottomCount = Math.max(1, Math.floor(scored.length * 0.3));
  const bottom = scored.slice(0, bottomCount);
  const candidate = bottom[Math.floor(Math.random() * bottom.length)];
  return recipes.find((recipe) => recipe.id === candidate.id) ?? null;
};

export async function maybeTriggerMutations(params: {
  recipes: Array<{ id: string; name: string; beat1Templates: unknown; beat2Templates: unknown }>;
  allowedIntents: string[];
  rules: Rules;
}) {
  if (!params.rules.optimiser_policy.test_dimensions.variant) return;
  const recipeStats = await prisma.armStats.findMany({
    where: { armType: "RECIPE" }
  });
  const eligible = recipeStats.filter(
    (row) => row.pulls >= params.rules.optimiser_policy.min_pulls_before_promote
  );
  const top = eligible
    .map((row) => ({
      id: row.armId,
      mean: posteriorMean(row.rewardSum, row.pulls, params.rules)
    }))
    .sort((a, b) => b.mean - a.mean)[0];
  const topRecipe = top ? params.recipes.find((recipe) => recipe.id === top.id) : null;

  if (topRecipe) {
    const variantCount = await prisma.variant.count({
      where: { recipeId: topRecipe.id, status: { in: ["active", "testing"] } }
    });
    if (variantCount < 6) {
      await maybeMutateRecipe({
        recipeId: topRecipe.id,
        recipeName: topRecipe.name,
        beat1Templates: topRecipe.beat1Templates as string[],
        beat2Templates: topRecipe.beat2Templates as string[],
        allowedIntents: params.allowedIntents,
        guardrails: params.rules.guardrails
      });
      return;
    }
  }

  const underperforming = await isUnderperforming(params.rules);
  const state = await getOptimizerState();
  if (!underperforming) {
    if ((state.underperformStreak ?? 0) > 0) {
      await saveOptimizerState({ ...state, underperformStreak: 0 });
    }
  } else {
    const nextStreak = (state.underperformStreak ?? 0) + 1;
    const shouldAct =
      nextStreak >= UNDERPERFORMANCE_STREAK_FOR_ACTION &&
      hoursSince(state.lastActionAt) > ACTION_COOLDOWN_HOURS;
    if (shouldAct) {
      const rulesRow = await prisma.setting.findUnique({ where: { key: "rules" } });
      const current = (rulesRow?.valueJson as Rules | undefined) ?? params.rules;
      const currentBudget = current.optimiser_policy.exploration_budget;
      const nextBudget = Math.min(EXPLORATION_MAX, currentBudget + EXPLORATION_STEP);
      if (nextBudget !== currentBudget) {
        await prisma.setting.upsert({
          where: { key: "rules" },
          update: {
            valueJson: {
              ...current,
              optimiser_policy: {
                ...current.optimiser_policy,
                exploration_budget: nextBudget
              }
            }
          },
          create: {
            key: "rules",
            valueJson: {
              ...current,
              optimiser_policy: {
                ...current.optimiser_policy,
                exploration_budget: nextBudget
              }
            }
          }
        });
      }
      if (hoursSince(state.lastArchetypeAt) > ACTION_COOLDOWN_HOURS) {
        await maybeCreateNewArchetype({
          allowedIntents: params.allowedIntents,
          guardrails: params.rules.guardrails,
          existingNames: params.recipes.map((recipe) => recipe.name)
        });
      }
      await saveOptimizerState({
        underperformStreak: nextStreak,
        lastActionAt: new Date().toISOString(),
        lastArchetypeAt: new Date().toISOString()
      });
    } else {
      await saveOptimizerState({ ...state, underperformStreak: nextStreak });
    }
  }

  const testingCount = await prisma.variant.count({ where: { status: "testing" } });
  if (testingCount < 4 && params.recipes.length > 0) {
    const seed =
      pickExplorationSeed(recipeStats, params.recipes, params.rules) ??
      params.recipes[Math.floor(Math.random() * params.recipes.length)];
    await maybeMutateRecipe({
      recipeId: seed.id,
      recipeName: seed.name,
      beat1Templates: seed.beat1Templates as string[],
      beat2Templates: seed.beat2Templates as string[],
      allowedIntents: params.allowedIntents,
      guardrails: params.rules.guardrails
    });
    return;
  }

  if (
    params.rules.optimiser_policy.plateau_days > 0 &&
    (await isPlateau(params.rules.optimiser_policy.plateau_days))
  ) {
    const seed =
      pickExplorationSeed(recipeStats, params.recipes, params.rules) ??
      params.recipes[Math.floor(Math.random() * params.recipes.length)];
    await maybeMutateRecipe({
      recipeId: seed.id,
      recipeName: seed.name,
      beat1Templates: seed.beat1Templates as string[],
      beat2Templates: seed.beat2Templates as string[],
      allowedIntents: params.allowedIntents,
      guardrails: params.rules.guardrails
    });
  }
}
