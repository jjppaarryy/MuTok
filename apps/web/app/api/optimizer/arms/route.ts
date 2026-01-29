import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getRulesSettings } from "../../../../lib/settings";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export async function GET() {
  const rules = await getRulesSettings();
  const stats = await prisma.armStats.findMany();
  const recipeIds = stats.filter((row) => row.armType === "RECIPE").map((row) => row.armId);
  const ctaIds = stats.filter((row) => row.armType === "CTA").map((row) => row.armId);
  const variantIds = stats.filter((row) => row.armType === "VARIANT").map((row) => row.armId);
  const clipIds = stats.filter((row) => row.armType === "CLIP").map((row) => row.armId);
  const snippetIds = stats.filter((row) => row.armType === "SNIPPET").map((row) => row.armId);

  const [recipes, ctas, variants, clips, snippets, plans, guardrailLogs, throttleLogs, recentMetrics, priorMetrics, repairLogs] =
    await Promise.all([
      prisma.hookRecipe.findMany({ where: { id: { in: recipeIds } } }),
      prisma.cta.findMany({ where: { id: { in: ctaIds } } }),
      prisma.variant.findMany({ where: { id: { in: variantIds } } }),
      prisma.clip.findMany({ where: { id: { in: clipIds } } }),
      prisma.snippet.findMany({ where: { id: { in: snippetIds } }, include: { track: true } }),
      prisma.postPlan.findMany({
        where: { createdAt: { gte: daysAgo(7) } },
        select: { experimentFlags: true }
      }),
      prisma.runLog.findMany({
        where: { runType: "planner_guardrails", startedAt: { gte: daysAgo(7) } }
      }),
      prisma.runLog.findMany({
        where: { runType: "pending_throttle", startedAt: { gte: daysAgo(7) } }
      }),
      prisma.metric.findMany({
        where: { collectedAt: { gte: daysAgo(7) } },
        select: { rewardScore: true }
      }),
      prisma.metric.findMany({
        where: { collectedAt: { gte: daysAgo(30), lt: daysAgo(7) } },
        select: { rewardScore: true }
      }),
      prisma.runLog.findMany({
        where: { runType: "brain_repair", startedAt: { gte: daysAgo(7) } }
      })
    ]);

  const recipeMap = new Map(recipes.map((row) => [row.id, row]));
  const ctaMap = new Map(ctas.map((row) => [row.id, row]));
  const variantMap = new Map(variants.map((row) => [row.id, row]));
  const clipMap = new Map(clips.map((row) => [row.id, row]));
  const snippetMap = new Map(snippets.map((row) => [row.id, row]));

  const priorMeanConfig = rules.optimiser_policy.prior_mean;
  const priorWeight = rules.optimiser_policy.prior_weight;

  const rows = stats.map((row) => {
    const pulls = row.pulls || 0;
    const mean =
      (row.rewardSum + priorMeanConfig * priorWeight) /
      Math.max(1, pulls + priorWeight);
    const confidence = pulls / Math.max(1, pulls + priorWeight);
    const name =
      row.armType === "RECIPE"
        ? recipeMap.get(row.armId)?.name ?? row.armId
        : row.armType === "CTA"
        ? ctaMap.get(row.armId)?.name ?? row.armId
        : row.armType === "VARIANT"
        ? variantMap.get(row.armId)?.beat1 ?? row.armId
        : row.armType === "CLIP"
        ? (() => {
            const clip = clipMap.get(row.armId);
            if (!clip) return row.armId;
            const file = clip.filePath.split("/").pop() ?? clip.filePath;
            return `${clip.category} · ${file}`;
          })()
        : row.armType === "SNIPPET"
        ? (() => {
            const snippet = snippetMap.get(row.armId);
            if (!snippet) return row.armId;
            const title = snippet.track?.title ?? "Snippet";
            return `${title} @ ${snippet.startSec.toFixed(1)}s`;
          })()
        : row.armId;
    const status =
      row.armType === "RECIPE"
        ? recipeMap.get(row.armId)?.enabled ? "enabled" : "disabled"
        : row.armType === "CTA"
        ? ctaMap.get(row.armId)?.status ?? "unknown"
        : row.armType === "VARIANT"
        ? variantMap.get(row.armId)?.status ?? "unknown"
        : "active";
    return {
      ...row,
      name,
      status,
      meanReward: mean,
      confidence
    };
  });

  type ExperimentFlags = { selection?: { recipe?: string } } | null;
  const exploreCount = plans.filter((plan) => {
    const flags = plan.experimentFlags as ExperimentFlags;
    const mode = flags?.selection?.recipe;
    return mode === "explore" || mode === "unpulled";
  }).length;
  const totalPlans = plans.length || 1;
  const explorationRate = exploreCount / totalPlans;

  const guardrailsExcluded = guardrailLogs.reduce((sum, log) => {
    const match = log.payloadExcerpt?.match(/warnings=(\d+)/);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);

  const recentScores = recentMetrics.map((row) => row.rewardScore ?? 0);
  const priorScores = priorMetrics.map((row) => row.rewardScore ?? 0);
  const recentMean =
    recentScores.reduce((sum, value) => sum + value, 0) / Math.max(1, recentScores.length);
  const priorMeanReward =
    priorScores.reduce((sum, value) => sum + value, 0) / Math.max(1, priorScores.length);
  const uplift = priorMeanReward
    ? (recentMean - priorMeanReward) / Math.abs(priorMeanReward)
    : 0;
  const sampleCount = recentScores.length;
  const confidenceBase = Math.min(1, sampleCount / 50);
  const upliftScore = uplift > 0 ? Math.min(1, uplift / 0.3) : 0;
  const viralConfidence = sampleCount < 10 ? 0 : confidenceBase * upliftScore;
  const repairEvents = repairLogs.length;

  return NextResponse.json({
    rows,
    summary: {
      explorationRate,
      guardrailsExcluded,
      throttleHits: throttleLogs.length,
      recentMeanReward: recentMean,
      priorMeanReward,
      uplift,
      viralConfidence,
      repairEvents
    }
  });
}
