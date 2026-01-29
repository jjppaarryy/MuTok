import { prisma } from "./prisma";

export type WinnerExample = {
  id: string;
  postPlanId: string;
  onscreenText: string;
  caption: string;
  hookFamily: string;
  recipeId: string | null;
  variantId: string | null;
  ctaIntent: string | null;
  container: string;
  clipCategories: string[];
  snippetSection: string | null;
  rewardScore: number;
  views: number;
  followerDelta: number | null;
  createdAt: Date;
};

/**
 * Identifies top-performing posts and stores them as winner examples.
 * Winner criteria: top 10% by rewardScore OR followerDelta > 5
 */
export async function identifyWinners(): Promise<number> {
  // Get all metrics with their plans
  const metrics = await prisma.metric.findMany({
    where: { rewardScore: { not: null } },
    orderBy: { rewardScore: "desc" }
  });

  if (metrics.length === 0) return 0;

  // Calculate top 10% threshold
  const top10PercentIndex = Math.max(1, Math.floor(metrics.length * 0.1));
  const rewardThreshold = metrics[top10PercentIndex - 1]?.rewardScore ?? 0;

  // Find winners: top 10% by reward OR followerDelta > 5
  const winnerMetrics = metrics.filter((m) => {
    const isTopReward = (m.rewardScore ?? 0) >= rewardThreshold;
    const hasGoodFollowerGrowth = (m.followerDelta ?? 0) > 5;
    return isTopReward || hasGoodFollowerGrowth;
  });

  let created = 0;
  for (const metric of winnerMetrics) {
    // Check if already stored
    const existing = await prisma.winnerExample.findUnique({
      where: { postPlanId: metric.postPlanId }
    });
    if (existing) continue;

    // Get full plan details
    const plan = await prisma.postPlan.findUnique({
      where: { id: metric.postPlanId }
    });
    if (!plan) continue;

    // Get clip categories
    const clipIds = Array.isArray(plan.clipIds) ? (plan.clipIds as string[]) : [];
    const clips = await prisma.clip.findMany({
      where: { id: { in: clipIds } },
      select: { category: true }
    });
    const clipCategories = clips.map((c) => c.category);

    // Get snippet section if available
    let snippetSection: string | null = null;
    if (plan.snippetId) {
      const snippet = await prisma.snippet.findUnique({
        where: { id: plan.snippetId },
        select: { section: true }
      });
      snippetSection = snippet?.section ?? null;
    }

    // Get CTA intent if available
    let ctaIntent: string | null = null;
    if (plan.ctaId) {
      const cta = await prisma.cta.findUnique({
        where: { id: plan.ctaId },
        select: { intent: true }
      });
      ctaIntent = cta?.intent ?? null;
    }

    // Create winner example
    await prisma.winnerExample.create({
      data: {
        postPlanId: plan.id,
        onscreenText: plan.onscreenText,
        caption: plan.caption,
        hookFamily: plan.hookFamily,
        recipeId: plan.recipeId,
        variantId: plan.variantId,
        ctaIntent,
        container: plan.container,
        clipCategories,
        snippetSection,
        rewardScore: metric.rewardScore ?? 0,
        views: metric.views,
        followerDelta: metric.followerDelta
      }
    });
    created++;
  }

  return created;
}

/**
 * Gets stored winner examples for use in prompts.
 */
export async function getWinnerExamples(limit = 10): Promise<WinnerExample[]> {
  const winners = await prisma.winnerExample.findMany({
    orderBy: { rewardScore: "desc" },
    take: limit
  });

  return winners.map((w) => ({
    id: w.id,
    postPlanId: w.postPlanId,
    onscreenText: w.onscreenText,
    caption: w.caption,
    hookFamily: w.hookFamily,
    recipeId: w.recipeId,
    variantId: w.variantId,
    ctaIntent: w.ctaIntent,
    container: w.container,
    clipCategories: Array.isArray(w.clipCategories) ? (w.clipCategories as string[]) : [],
    snippetSection: w.snippetSection,
    rewardScore: w.rewardScore,
    views: w.views,
    followerDelta: w.followerDelta,
    createdAt: w.createdAt
  }));
}

/**
 * Formats winner examples for the brain prompt with detailed context.
 */
export function formatWinnersForPrompt(winners: WinnerExample[]): string {
  if (winners.length === 0) {
    return "No winning posts recorded yet.";
  }

  const formatted = winners.map((w, i) => {
    const lines = [
      `Winner #${i + 1}:`,
      `  Hook Family: ${w.hookFamily}`,
      `  Container: ${w.container}`,
      `  On-screen Text: "${w.onscreenText.replace(/\n/g, " | ")}"`,
      `  CTA Intent: ${w.ctaIntent ?? "unknown"}`,
      `  Clip Categories: ${w.clipCategories.join(", ") || "unknown"}`,
      `  Snippet Section: ${w.snippetSection ?? "unknown"}`,
      `  Performance: ${w.views.toLocaleString()} views, reward=${w.rewardScore.toFixed(2)}${w.followerDelta ? `, +${w.followerDelta} followers` : ""}`
    ];
    return lines.join("\n");
  });

  return [
    "TOP PERFORMING POSTS (learn from these):",
    "",
    ...formatted
  ].join("\n");
}

/**
 * Gets a summary of what's working based on winner examples.
 */
export async function getWinnerInsights(): Promise<{
  topHookFamilies: string[];
  topContainers: string[];
  topCtaIntents: string[];
  avgRewardScore: number;
}> {
  const winners = await getWinnerExamples(20);

  if (winners.length === 0) {
    return {
      topHookFamilies: [],
      topContainers: [],
      topCtaIntents: [],
      avgRewardScore: 0
    };
  }

  // Count occurrences
  const hookCounts = new Map<string, number>();
  const containerCounts = new Map<string, number>();
  const ctaCounts = new Map<string, number>();
  let totalReward = 0;

  for (const w of winners) {
    hookCounts.set(w.hookFamily, (hookCounts.get(w.hookFamily) ?? 0) + 1);
    containerCounts.set(w.container, (containerCounts.get(w.container) ?? 0) + 1);
    if (w.ctaIntent) {
      ctaCounts.set(w.ctaIntent, (ctaCounts.get(w.ctaIntent) ?? 0) + 1);
    }
    totalReward += w.rewardScore;
  }

  // Sort by count
  const topHookFamilies = [...hookCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const topContainers = [...containerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const topCtaIntents = [...ctaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  return {
    topHookFamilies,
    topContainers,
    topCtaIntents,
    avgRewardScore: totalReward / winners.length
  };
}
