import { DateTime } from "luxon";
import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";
import { getRecoveryStatus } from "./recoveryMode";

type ScoreBucket = { scoreSum: number; count: number };

const addScore = (map: Map<string, ScoreBucket>, key: string, score: number) => {
  const current = map.get(key) ?? { scoreSum: 0, count: 0 };
  current.scoreSum += score;
  current.count += 1;
  map.set(key, current);
};

const toLeaderboard = (map: Map<string, ScoreBucket>, label: string) => {
  return [...map.entries()]
    .map(([key, value]) => ({
      [label]: key,
      score: value.count ? value.scoreSum / value.count : 0,
      count: value.count
    }))
    .sort((a, b) => b.score - a.score);
};

export async function getAnalyticsSummary() {
  const rules = await getRulesSettings();
  const recovery = await getRecoveryStatus(rules);
  const metrics = await prisma.metric.findMany({ where: { rewardScore: { not: null } } });
  const plans = await prisma.postPlan.findMany({
    select: { id: true, recipeId: true, container: true, snippetId: true, clipIds: true }
  });
  const planMap = new Map(plans.map((plan) => [plan.id, plan]));

  const recipes = await prisma.hookRecipe.findMany({
    select: { id: true, name: true, enabled: true }
  });
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe.name]));
  const snippets = await prisma.snippet.findMany({
    select: { id: true, moment3to7: true, moment7to11: true }
  });
  const snippetMap = new Map(snippets.map((snippet) => [snippet.id, snippet]));
  const clips = await prisma.clip.findMany({ select: { id: true, category: true } });
  const clipMap = new Map(clips.map((clip) => [clip.id, clip.category]));

  const totals = metrics.reduce(
    (acc, metric) => {
      acc.views += metric.views;
      acc.likes += metric.likes;
      acc.comments += metric.comments;
      acc.shares += metric.shares;
      return acc;
    },
    { views: 0, likes: 0, comments: 0, shares: 0 }
  );

  const recipeStats = new Map<string, ScoreBucket>();
  const recipeStats7d = new Map<string, ScoreBucket>();
  const recipeStats14d = new Map<string, ScoreBucket>();
  const containerStats = new Map<string, ScoreBucket>();
  const snippetStats = new Map<string, ScoreBucket>();
  const clipCategoryStats = new Map<string, ScoreBucket>();
  const pairingStats = new Map<string, ScoreBucket>();
  const cutoff7d = DateTime.local().minus({ days: 7 }).toJSDate();
  const cutoff14d = DateTime.local().minus({ days: 14 }).toJSDate();

  for (const metric of metrics) {
    const plan = planMap.get(metric.postPlanId);
    const score = metric.rewardScore ?? 0;
    if (!plan || score <= 0) continue;

    const recipeName = plan.recipeId ? recipeMap.get(plan.recipeId) : null;
    if (recipeName) {
      addScore(recipeStats, recipeName, score);
      if (metric.createTime >= cutoff7d) {
        addScore(recipeStats7d, plan.recipeId ?? recipeName, score);
      }
      if (metric.createTime >= cutoff14d) {
        addScore(recipeStats14d, plan.recipeId ?? recipeName, score);
      }
    }
    addScore(containerStats, plan.container, score);

    const snippet = plan.snippetId ? snippetMap.get(plan.snippetId) : null;
    const strategy = snippet?.moment3to7 ? "moment_3_7" : snippet?.moment7to11 ? "moment_7_11" : "any";
    addScore(snippetStats, strategy, score);

    const clipIds = Array.isArray(plan.clipIds) ? (plan.clipIds as string[]) : [];
    const categories = new Set(clipIds.map((clipId) => clipMap.get(clipId)).filter(Boolean) as string[]);
    for (const category of categories) {
      addScore(clipCategoryStats, category, score);
    }

    if (plan.recipeId) {
      const pairingKey = `${recipeName ?? plan.recipeId} · ${plan.container}`;
      addScore(pairingStats, pairingKey, score);
    }
  }

  const activeRecipes = recipes.filter((recipe) => recipe.enabled).length;
  const cooldownDays = rules.spam_guardrails.recipe_cooldown_days;
  const requiredRecipes = rules.cadence_per_day * cooldownDays;
  const shortfall = Math.max(0, requiredRecipes - activeRecipes);
  const recipeScores = recipes.map((recipe) => {
    const score7 = recipeStats7d.get(recipe.id) ?? { scoreSum: 0, count: 0 };
    const score14 = recipeStats14d.get(recipe.id) ?? { scoreSum: 0, count: 0 };
    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      enabled: recipe.enabled,
      score7d: score7.count ? score7.scoreSum / score7.count : 0,
      count7d: score7.count,
      score14d: score14.count ? score14.scoreSum / score14.count : 0,
      count14d: score14.count
    };
  });
  const retireCandidates = recipeScores.filter(
    (recipe) =>
      recipe.enabled &&
      recipe.count14d >= rules.spam_guardrails.retire_min_posts &&
      recipe.score14d < rules.spam_guardrails.retire_score_threshold
  );

  return {
    totals,
    recipeLeaderboard: toLeaderboard(recipeStats, "recipe"),
    containerLeaderboard: toLeaderboard(containerStats, "container"),
    snippetLeaderboard: toLeaderboard(snippetStats, "snippetStrategy"),
    clipCategoryLeaderboard: toLeaderboard(clipCategoryStats, "clipCategory"),
    pairingLeaderboard: toLeaderboard(pairingStats, "pairing"),
    recipeScores,
    coverage: {
      activeRecipes,
      requiredRecipes,
      shortfall,
      cadencePerDay: rules.cadence_per_day,
      cooldownDays
    },
    notifications: {
      retireCandidates
    },
    recovery
  };
}
