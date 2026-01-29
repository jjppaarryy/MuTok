export type ClipMeta = {
  id: string;
  energy: number;
  motion: "low" | "med" | "high";
  sync: "safe" | "sensitive" | "critical";
  category: string;
  vibe?: string | null;
};

export type SnippetMeta = {
  id: string;
  energyScore: number;
  energy?: number | null;
  section?: string | null;
  vibe?: string | null;
};

export type CompatibilityResult = {
  score: number;
  reasons: string[];
  blocked: boolean;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function computeCompatibility(
  clip: ClipMeta,
  snippet: SnippetMeta,
  options?: {
    disallowHandsKeysLiteral?: boolean;
    energyWeight?: number;
    motionWeight?: number;
    syncPenalty?: number;
  }
): CompatibilityResult {
  const reasons: string[] = [];
  const disallowHandsKeysLiteral = options?.disallowHandsKeysLiteral ?? true;

  if (clip.sync === "critical") {
    return {
      score: 0,
      reasons: ["Blocked: sync is critical"],
      blocked: true
    };
  }

  if (disallowHandsKeysLiteral && clip.category === "Hands_keys_literal") {
    return {
      score: 0,
      reasons: ["Blocked: category disallowed in v1"],
      blocked: true
    };
  }

  const energyWeight = options?.energyWeight ?? 0.6;
  const motionWeight = options?.motionWeight ?? 0.3;
  const syncPenalty = options?.syncPenalty ?? 0.1;

  const snippetEnergy = snippet.energy ?? snippet.energyScore;
  const energyDelta = Math.abs(clip.energy - snippetEnergy);
  const energyScore = clamp(1 - energyDelta / 5);

  const motionScore = clip.motion === "high" ? 1 : clip.motion === "med" ? 0.8 : 0.6;

  let score = energyScore * energyWeight + motionScore * motionWeight;

  if (snippet.section === "breakdown" && clip.motion === "high") {
    score = clamp(score - 0.15);
    reasons.push("Breakdown snippet paired with high-motion clip");
  }
  if ((snippet.section === "drop" || snippet.section === "payoff") && clip.motion === "low") {
    score = clamp(score - 0.15);
    reasons.push("High-energy snippet paired with low-motion clip");
  }
  if (snippet.vibe && clip.vibe && snippet.vibe !== "any" && snippet.vibe !== clip.vibe) {
    score = clamp(score - 0.1);
    reasons.push("Vibe mismatch between clip and snippet");
  }

  if (clip.sync === "sensitive") {
    score = clamp(score - syncPenalty);
    reasons.push("Sync sensitive: small penalty applied");
  }

  reasons.push(`Energy match: ${energyScore.toFixed(2)}`);
  reasons.push(`Motion match: ${motionScore.toFixed(2)}`);

  return {
    score: clamp(score),
    reasons,
    blocked: false
  };
}
