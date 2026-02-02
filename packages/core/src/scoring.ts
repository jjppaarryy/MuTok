export type ClipMeta = {
  id: string;
  sync: "safe" | "sensitive" | "critical";
  category: string;
};

export type SnippetMeta = {
  id: string;
  section?: string | null;
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

  const syncPenalty = options?.syncPenalty ?? 0.1;
  let score = 0.75;
  const clipMoment = clip.category;
  const snippetMoment = snippet.section ?? "unset";
  const matchable = clipMoment !== "neutral" && snippetMoment !== "unset" && snippetMoment !== "neutral";
  if (matchable) {
    if (clipMoment === snippetMoment) {
      score = clamp(score + 0.12);
      reasons.push("Moment match between clip and snippet");
    } else {
      score = clamp(score - 0.08);
      reasons.push("Moment mismatch between clip and snippet");
    }
  }

  if (clip.sync === "sensitive") {
    score = clamp(score - syncPenalty);
    reasons.push("Sync sensitive: small penalty applied");
  }

  if (snippet.section) {
    reasons.push(`Snippet section: ${snippet.section}`);
  }

  return {
    score: clamp(score),
    reasons,
    blocked: false
  };
}
