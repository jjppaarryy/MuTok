import { prisma } from "./prisma";
import { validateTwoBeatStructure } from "./brainRepair";
import { validateBeat1 } from "./planSelection";
import { getRulesSettings } from "./settings";

export type PreflightScore = {
  score: number; // 0-100
  confidence: "high" | "medium" | "low";
  factors: {
    recipePerformance: number;
    clipQuality: number;
    hookStrength: number;
    beatStructure: number;
    compatibilityScore: number;
  };
  recommendation: "upload" | "review" | "block";
  reasons: string[];
};

type PostPlanInput = {
  id: string;
  onscreenText: string;
  hookFamily: string;
  recipeId: string | null;
  container: string;
  compatibilityScore: number;
  clipIds: string[];
};

/**
 * Scores a post before upload to predict performance and protect account health.
 */
export async function scorePost(postPlan: PostPlanInput): Promise<PreflightScore> {
  const settings = await getRulesSettings();
  const reasons: string[] = [];
  
  // Factor 1: Recipe historical performance (0-25 points)
  let recipePerformance = 15; // Default middle score
  if (postPlan.recipeId) {
    const recipeStats = await prisma.armStats.findFirst({
      where: { armType: "RECIPE", armId: postPlan.recipeId }
    });
    if (recipeStats && recipeStats.pulls >= 3) {
      const avgReward = recipeStats.rewardSum / Math.max(1, recipeStats.pulls);
      // Scale to 0-25 based on reward (assuming reward range 0-10)
      recipePerformance = Math.min(25, Math.max(0, avgReward * 2.5));
      if (avgReward > 5) {
        reasons.push(`Recipe has good historical performance (avg reward: ${avgReward.toFixed(2)})`);
      } else if (avgReward < 2) {
        reasons.push(`Recipe has poor historical performance (avg reward: ${avgReward.toFixed(2)})`);
      }
    } else {
      reasons.push("Recipe has limited data (exploration mode)");
    }
  }

  // Factor 2: Clip quality based on category performance (0-20 points)
  let clipQuality = 12; // Default
  if (postPlan.clipIds.length > 0) {
    const clipStats = await prisma.armStats.findMany({
      where: { armType: "CLIP", armId: { in: postPlan.clipIds } }
    });
    if (clipStats.length > 0) {
      const avgClipReward = clipStats.reduce((sum, s) => {
        return sum + (s.pulls > 0 ? s.rewardSum / s.pulls : 0);
      }, 0) / clipStats.length;
      clipQuality = Math.min(20, Math.max(0, avgClipReward * 2));
      if (avgClipReward > 4) {
        reasons.push("Clips have good historical performance");
      }
    }
  }

  // Factor 3: Hook strength - Beat 1 validation (0-25 points)
  let hookStrength = 20; // Default
  const beats = postPlan.onscreenText.split("\n").map((l) => l.trim());
  const beat1 = beats[0] ?? "";
  const beat1Validation = validateBeat1(beat1, settings);
  
  if (!beat1Validation.valid) {
    hookStrength = 8;
    reasons.push(`Beat 1 issue: ${beat1Validation.reason}`);
  } else {
    // Bonus for short, punchy hooks
    if (beat1.length <= 25) {
      hookStrength = 25;
      reasons.push("Beat 1 is concise and punchy");
    } else if (beat1.length <= 35) {
      hookStrength = 22;
    }
  }

  // Factor 4: Two-beat structure compliance (0-15 points)
  let beatStructure = 15; // Default
  const twoBeatValidation = validateTwoBeatStructure(postPlan.onscreenText);
  
  if (!twoBeatValidation.valid) {
    beatStructure = 5;
    reasons.push(`Two-beat issue: ${twoBeatValidation.reason}`);
  } else {
    if (twoBeatValidation.hasBeat2Instruction) {
      reasons.push("Beat 2 has clear instruction/CTA");
    }
  }

  // Factor 5: Compatibility score (0-15 points)
  const compatibilityScore = Math.min(15, postPlan.compatibilityScore * 15);
  if (postPlan.compatibilityScore >= 0.8) {
    reasons.push("High clip-snippet compatibility");
  } else if (postPlan.compatibilityScore < 0.5) {
    reasons.push("Low clip-snippet compatibility");
  }

  // Calculate total score
  const totalScore = Math.round(
    recipePerformance +
    clipQuality +
    hookStrength +
    beatStructure +
    compatibilityScore
  );

  // Determine confidence based on data availability
  const hasEnoughData = await checkDataAvailability(postPlan);
  const confidence: "high" | "medium" | "low" = hasEnoughData
    ? totalScore >= 60 ? "high" : "medium"
    : "low";

  // Determine recommendation based on score and thresholds
  const minScore = settings.viral_engine.preflight_min_score ?? 40;
  const reviewScore = settings.viral_engine.preflight_review_score ?? 60;
  
  let recommendation: "upload" | "review" | "block";
  if (totalScore >= reviewScore) {
    recommendation = "upload";
  } else if (totalScore >= minScore) {
    recommendation = "review";
    reasons.push(`Score ${totalScore} is below review threshold (${reviewScore})`);
  } else {
    recommendation = "block";
    reasons.push(`Score ${totalScore} is below minimum threshold (${minScore})`);
  }

  return {
    score: totalScore,
    confidence,
    factors: {
      recipePerformance,
      clipQuality,
      hookStrength,
      beatStructure,
      compatibilityScore
    },
    recommendation,
    reasons
  };
}

async function checkDataAvailability(postPlan: PostPlanInput): Promise<boolean> {
  // Check if we have enough historical data to make confident predictions
  const recipeStats = postPlan.recipeId
    ? await prisma.armStats.findFirst({
        where: { armType: "RECIPE", armId: postPlan.recipeId }
      })
    : null;
  
  const hookStats = await prisma.armStats.findMany({
    where: { armType: "RECIPE" }
  });
  
  // Consider data sufficient if recipe has 3+ pulls OR we have 10+ total recipe pulls
  const totalPulls = hookStats.reduce((sum, s) => sum + s.pulls, 0);
  const recipePulls = recipeStats?.pulls ?? 0;
  
  return recipePulls >= 3 || totalPulls >= 10;
}

/**
 * Quick check if a post should be blocked (for use in upload route).
 */
export async function shouldBlockUpload(postPlanId: string): Promise<{
  block: boolean;
  reason?: string;
  score?: number;
}> {
  const plan = await prisma.postPlan.findUnique({
    where: { id: postPlanId }
  });
  
  if (!plan) {
    return { block: true, reason: "Post plan not found" };
  }

  const settings = await getRulesSettings();
  const minScore = settings.viral_engine.preflight_min_score ?? 40;
  
  // Skip scoring if threshold is 0 (disabled)
  if (minScore <= 0) {
    return { block: false };
  }

  const clipIds = Array.isArray(plan.clipIds) ? (plan.clipIds as string[]) : [];
  
  const scoreResult = await scorePost({
    id: plan.id,
    onscreenText: plan.onscreenText,
    hookFamily: plan.hookFamily,
    recipeId: plan.recipeId,
    container: plan.container,
    compatibilityScore: plan.compatibilityScore,
    clipIds
  });

  if (scoreResult.recommendation === "block") {
    return {
      block: true,
      reason: `Preflight score too low (${scoreResult.score}/${minScore} min)`,
      score: scoreResult.score
    };
  }

  return { block: false, score: scoreResult.score };
}
