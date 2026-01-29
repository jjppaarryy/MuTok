type RelevanceInput = {
  beat1: string;
  beat2: string;
  hookFamily: string;
  comparisonMode: boolean;
  optionsCount: number;
};

type RelevanceResult = {
  beat2: string;
  onscreenText: string;
  repairApplied: boolean;
  reason?: "multiOptionCtaInvalid";
};

const multiOptionTokens = [
  "favourite",
  "choose",
  "pick",
  "which one",
  "a or b",
  "version",
  "1 or 2",
  "vote 1",
  "vote 2"
];

const hasMultiOptionCta = (text: string) => {
  const lower = text.toLowerCase();
  if (multiOptionTokens.some((token) => lower.includes(token))) return true;
  if (/\b[ab]\s+or\s+[ab]\b/i.test(text)) return true;
  if (/\b\d\s+or\s+\d\b/i.test(text)) return true;
  return false;
};

const pickSingleItemCta = (hookFamily: string) => {
  if (hookFamily === "youre_early") return "KEEP or SKIP?";
  if (hookFamily === "dj_context") return "Warm-up or peak-time?";
  return "KEEP or SKIP?";
};

export const validateCtaRelevance = (input: RelevanceInput): RelevanceResult => {
  if (!hasMultiOptionCta(input.beat2)) {
    return {
      beat2: input.beat2,
      onscreenText: `${input.beat1}\n${input.beat2}`,
      repairApplied: false
    };
  }

  if (input.comparisonMode && input.optionsCount >= 2) {
    return {
      beat2: input.beat2,
      onscreenText: `${input.beat1}\n${input.beat2}`,
      repairApplied: false
    };
  }

  const replacement = pickSingleItemCta(input.hookFamily);
  return {
    beat2: replacement,
    onscreenText: `${input.beat1}\n${replacement}`,
    repairApplied: true,
    reason: "multiOptionCtaInvalid"
  };
};
