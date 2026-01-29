import { prisma } from "./prisma";

const categories = [
  "DAW_screen",
  "Studio_portrait",
  "Hands_knobs_faders",
  "Hands_keys_abstract",
  "Hands_keys_literal",
  "Lifestyle_broll",
  "Abstract_visual",
  "Text_background",
  "DJing",
  "Crowd_stage"
];

export async function getAnalyticsSummary() {
  const metrics = await prisma.metric.findMany();
  const plans = await prisma.postPlan.findMany({
    select: { id: true, hookFamily: true, container: true }
  });

  const planMap = new Map(plans.map((plan) => [plan.id, plan]));

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

  const hookStats = new Map<string, { views: number; score: number }>();
  const containerStats = new Map<string, { views: number; score: number }>();

  for (const metric of metrics) {
    const plan = planMap.get(metric.postPlanId);
    if (!plan) continue;

    const retentionProxy = metric.views
      ? (metric.likes + metric.shares) / metric.views
      : 0;
    const interactionProxy = metric.views ? metric.comments / metric.views : 0;
    const viralScore = retentionProxy * 0.6 + interactionProxy * 0.4;

    const hook = hookStats.get(plan.hookFamily) ?? { views: 0, score: 0 };
    hook.views += metric.views;
    hook.score += viralScore;
    hookStats.set(plan.hookFamily, hook);

    const container = containerStats.get(plan.container) ?? { views: 0, score: 0 };
    container.views += metric.views;
    container.score += viralScore;
    containerStats.set(plan.container, container);
  }

  const hookLeaderboard = [...hookStats.entries()]
    .map(([hookFamily, value]) => ({
      hookFamily,
      score: value.score,
      views: value.views
    }))
    .sort((a, b) => b.score - a.score);

  const containerLeaderboard = [...containerStats.entries()]
    .map(([container, value]) => ({
      container,
      score: value.score,
      views: value.views
    }))
    .sort((a, b) => b.score - a.score);

  const clips = await prisma.clip.findMany({
    select: { category: true }
  });
  const categoryCounts = new Map(categories.map((category) => [category, 0]));
  for (const clip of clips) {
    categoryCounts.set(
      clip.category,
      (categoryCounts.get(clip.category) ?? 0) + 1
    );
  }

  const recommendations = [...categoryCounts.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([category]) => category);

  return {
    totals,
    hookLeaderboard,
    containerLeaderboard,
    recommendations
  };
}
