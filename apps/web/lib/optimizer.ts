import { prisma } from "./prisma";

export type ArmType = "RECIPE" | "CTA" | "CONTAINER" | "VARIANT" | "CLIP" | "SNIPPET" | "CLIP_CATEGORY" | "SNIPPET_STRATEGY";

const defaultCtas = [
  { name: "Hold or skip", template: "KEEP or SKIP?", intent: "KEEP_SKIP" },
  { name: "Comment prompt", template: "What vibe is this?", intent: "COMMENT_VIBE" },
  { name: "Follow for more", template: "Follow for the full ID.", intent: "FOLLOW_FULL" },
  { name: "Save / rewatch", template: "Save this for later.", intent: "SAVE_REWATCH" },
  { name: "Link / DM", template: "Link in bio.", intent: "LINK_DM" },
  { name: "Pick A/B (legacy)", template: "A or B?", intent: "PICK_AB" }
];

export async function ensureDefaultCtas() {
  const count = await prisma.cta.count();
  if (count > 0) return;
  await prisma.cta.createMany({
    data: defaultCtas.map((cta) => ({
      name: cta.name,
      template: cta.template,
      intent: cta.intent,
      status: "active",
      createdBy: "system"
    }))
  });
}

const ucbScore = (mean: number, pulls: number, total: number) => {
  if (pulls <= 0) return Number.POSITIVE_INFINITY;
  return mean + Math.sqrt((2 * Math.log(Math.max(1, total))) / pulls);
};

type ArmSelection = {
  id: string;
  mode: "explore" | "exploit" | "unpulled";
};

export async function selectArm(
  armType: ArmType,
  armIds: string[],
  explorationBudget: number,
  priorMean = 0,
  priorWeight = 0,
  minPullsForExploit = 0,
  priorBoosts?: Record<string, { extraWeight: number; maxPulls: number }>
): Promise<ArmSelection | null> {
  if (armIds.length === 0) return null;
  const stats = await prisma.armStats.findMany({
    where: { armType, armId: { in: armIds } }
  });
  const statsMap = new Map(stats.map((row) => [row.armId, row]));
  const unpulled = armIds.filter((id) => (statsMap.get(id)?.pulls ?? 0) === 0);
  const totalPulls = stats.reduce((sum, row) => sum + row.pulls, 0);
  const maxPulls = stats.reduce((max, row) => Math.max(max, row.pulls), 0);
  const explore = Math.random() < explorationBudget;
  const forceExplore = minPullsForExploit > 0 && maxPulls < minPullsForExploit;

  if (forceExplore || explore || unpulled.length > 0) {
    const pick = unpulled.length > 0 ? unpulled : armIds;
    return {
      id: pick[Math.floor(Math.random() * pick.length)],
      mode: unpulled.length > 0 ? "unpulled" : "explore"
    };
  }

  const scored = armIds.map((id) => {
    const row = statsMap.get(id);
    const pulls = row?.pulls ?? 0;
    const boost = priorBoosts?.[id];
    const boostWeight = boost && pulls < boost.maxPulls ? boost.extraWeight : 0;
    const effectivePrior = priorWeight + boostWeight;
    const mean = row
      ? (row.rewardSum + priorMean * effectivePrior) / Math.max(1, pulls + effectivePrior)
      : effectivePrior > 0
      ? priorMean
      : 0;
    return { id, score: ucbScore(mean, pulls, totalPulls) };
  });
  scored.sort((a, b) => b.score - a.score);
  return {
    id: scored[0]?.id ?? armIds[0],
    mode: "exploit"
  };
}

// Check if the daily counter needs to be reset (new day)
function shouldResetDailyCounter(lastResetAt: Date | null): boolean {
  if (!lastResetAt) return true;
  const now = new Date();
  const lastReset = new Date(lastResetAt);
  // Reset if the last reset was on a different day
  return (
    now.getFullYear() !== lastReset.getFullYear() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getDate() !== lastReset.getDate()
  );
}

export async function recordArmUse(armType: ArmType, armId: string) {
  const existing = await prisma.armStats.findFirst({
    where: { armType, armId }
  });
  const now = new Date();
  
  if (existing) {
    // Check if we need to reset the daily counter
    const resetDaily = shouldResetDailyCounter(existing.lastResetAt);
    await prisma.armStats.update({
      where: { id: existing.id },
      data: {
        pulls: existing.pulls + 1,
        lastUsedAt: now,
        usesToday: resetDaily ? 1 : (existing.usesToday ?? 0) + 1,
        lastResetAt: resetDaily ? now : existing.lastResetAt
      }
    });
    return;
  }
  await prisma.armStats.create({
    data: { armType, armId, pulls: 1, lastUsedAt: now, usesToday: 1, lastResetAt: now }
  });
}


export async function updateArmStats(params: {
  armType: ArmType;
  armId: string;
  impressions: number;
  conversions: number;
  reward: number;
}) {
  const existing = await prisma.armStats.findFirst({
    where: { armType: params.armType, armId: params.armId }
  });
  if (existing) {
    await prisma.armStats.update({
      where: { id: existing.id },
      data: {
        impressions: existing.impressions + params.impressions,
        conversions: existing.conversions + params.conversions,
        rewardSum: existing.rewardSum + params.reward
      }
    });
    return;
  }
  await prisma.armStats.create({
    data: {
      armType: params.armType,
      armId: params.armId,
      impressions: params.impressions,
      conversions: params.conversions,
      rewardSum: params.reward,
      pulls: 1
    }
  });
}

export async function updateArmStatsForPlan(params: {
  planId: string;
  impressions: number;
  conversions: number;
  reward: number;
  minViews: number;
}) {
  if (params.impressions < params.minViews) return;
  const plan = await prisma.postPlan.findUnique({
    where: { id: params.planId },
    select: { recipeId: true, container: true, snippetId: true, clipIds: true }
  });
  if (!plan) return;
  const updates: Array<{ armType: ArmType; armId: string }> = [];
  if (plan.recipeId) updates.push({ armType: "RECIPE", armId: plan.recipeId });
  updates.push({ armType: "CONTAINER", armId: plan.container });
  if (plan.snippetId) {
    const snippet = await prisma.snippet.findUnique({
      where: { id: plan.snippetId },
      select: { moment3to7: true, moment7to11: true }
    });
    const strategy = snippet?.moment3to7
      ? "moment_3_7"
      : snippet?.moment7to11
      ? "moment_7_11"
      : "any";
    updates.push({ armType: "SNIPPET_STRATEGY", armId: strategy });
  }
  const clipIds = Array.isArray(plan.clipIds) ? (plan.clipIds as string[]) : [];
  if (clipIds.length > 0) {
    const clips = await prisma.clip.findMany({
      where: { id: { in: clipIds } },
      select: { category: true }
    });
    const uniqueCategories = new Set(clips.map((clip) => clip.category));
    for (const category of uniqueCategories) {
      updates.push({ armType: "CLIP_CATEGORY", armId: category });
    }
  }

  for (const update of updates) {
    await updateArmStats({
      armType: update.armType,
      armId: update.armId,
      impressions: params.impressions,
      conversions: params.conversions,
      reward: params.reward
    });
  }
}

export async function promoteRetireArms(params: {
  priorMean: number;
  priorWeight: number;
  minPullsBeforePromote: number;
  minPullsBeforeRetire: number;
  promotionMinImpressions: number;
  promotionUplift: number;
  retirementMinPulls: number;
}) {
  const stats = await prisma.armStats.findMany();
  const armTypes: ArmType[] = ["RECIPE"];
  const promoted: string[] = [];
  const retired: string[] = [];

  for (const armType of armTypes) {
    const rows = stats.filter((row) => row.armType === armType);
    if (rows.length === 0) continue;

    const baselinePool = rows.filter((row) => row.pulls >= params.minPullsBeforePromote);
    const baselineMean = baselinePool.length
      ? baselinePool.reduce((sum, row) => {
          const pulls = row.pulls ?? 0;
          const mean =
            (row.rewardSum + params.priorMean * params.priorWeight) /
            Math.max(1, pulls + params.priorWeight);
          return sum + mean;
        }, 0) / baselinePool.length
      : params.priorMean;

    for (const row of rows) {
      const pulls = row.pulls ?? 0;
      const impressions = row.impressions ?? 0;
      const mean =
        (row.rewardSum + params.priorMean * params.priorWeight) /
        Math.max(1, pulls + params.priorWeight);
      const promoteThreshold = baselineMean * (1 + params.promotionUplift);
      const retireThreshold = baselineMean * (1 - params.promotionUplift);

      if (
        pulls >= params.minPullsBeforePromote &&
        impressions >= params.promotionMinImpressions &&
        mean >= promoteThreshold
      ) {
        if (armType === "RECIPE") {
          const updated = await prisma.hookRecipe.updateMany({
            where: { id: row.armId, enabled: false },
            data: { enabled: true }
          });
          if (updated.count > 0) promoted.push(row.armId);
        }
      }

      if (
        pulls >= params.minPullsBeforeRetire &&
        pulls >= params.retirementMinPulls &&
        impressions >= params.promotionMinImpressions &&
        mean <= retireThreshold
      ) {
        if (armType === "RECIPE") {
          const updated = await prisma.hookRecipe.updateMany({
            where: { id: row.armId, enabled: true },
            data: { enabled: false }
          });
          if (updated.count > 0) retired.push(row.armId);
        }
      }
    }
  }

  return { promoted, retired };
}
