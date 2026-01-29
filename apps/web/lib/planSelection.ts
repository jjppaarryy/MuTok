import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";
import { pickRandom, pickTemplate } from "./plannerUtils";
import { ensureDefaultCtas, selectArm } from "./optimizer";

type Rules = Awaited<ReturnType<typeof getRulesSettings>>;

type SelectionMode = "explore" | "exploit" | "unpulled" | "locked";

type SelectionResult<T> = {
  value: T;
  mode: SelectionMode;
};

const normalize = (text: string) => text.toLowerCase();

export type Beat1ValidationResult = {
  valid: boolean;
  reason?: string;
};

export const validateBeat1 = (beat1: string, rules: Rules): Beat1ValidationResult => {
  const trimmed = beat1.trim();
  const normalized = normalize(trimmed);
  
  // Check max length
  if (trimmed.length > (rules.guardrails.beat1_max_chars ?? 40)) {
    return { valid: false, reason: `Beat 1 too long (${trimmed.length} > ${rules.guardrails.beat1_max_chars ?? 40} chars)` };
  }
  
  // Check for questions (if disallowed)
  if (rules.guardrails.beat1_no_questions && trimmed.includes("?")) {
    return { valid: false, reason: "Beat 1 should not be a question (save for Beat 2)" };
  }
  
  // Check for trigger words (at least one must be present)
  const triggers = rules.guardrails.beat1_triggers ?? [];
  if (triggers.length > 0) {
    const hasTrigger = triggers.some((trigger) => normalized.includes(trigger.toLowerCase()));
    if (!hasTrigger) {
      return { valid: false, reason: `Beat 1 missing hook trigger (need one of: ${triggers.slice(0, 5).join(", ")}...)` };
    }
  }
  
  return { valid: true };
};

const isBeatValid = (beat1: string, beat2: string, rules: Rules) => {
  if (beat1.includes("\n") || beat2.includes("\n")) return false;
  const combined = normalize(`${beat1} ${beat2}`);
  if (rules.guardrails.banned_words.some((word) => combined.includes(word))) {
    return false;
  }
  if (rules.guardrails.banned_phrases.some((phrase) => combined.includes(phrase))) {
    return false;
  }
  if (rules.voice_banned_words.some((word) => combined.includes(word))) {
    return false;
  }
  // Also validate Beat 1 specific rules
  const beat1Validation = validateBeat1(beat1, rules);
  if (!beat1Validation.valid) {
    return false;
  }
  return true;
};

const pickLocked = <T,>(locked: T[], unlocked: T[], maxShare: number) => {
  if (locked.length === 0) return null;
  if (unlocked.length === 0) return { value: pickRandom(locked), mode: "locked" as const };
  if (Math.random() < maxShare) return { value: pickRandom(locked), mode: "locked" as const };
  return null;
};

export async function selectContainer(
  containers: string[],
  rules: Rules
): Promise<SelectionResult<string>> {
  if (!rules.optimiser_policy.test_dimensions.container) {
    return { value: pickRandom(containers), mode: "exploit" };
  }
  const selected = await selectArm(
    "CONTAINER",
    containers,
    rules.optimiser_policy.exploration_budget,
    rules.optimiser_policy.prior_mean,
    rules.optimiser_policy.prior_weight,
    rules.optimiser_policy.min_pulls_before_promote
  );
  return {
    value: selected?.id ?? pickRandom(containers),
    mode: selected?.mode ?? "exploit"
  };
}

export async function selectSnippet(
  snippets: Array<{ id: string; moment3to7: boolean; moment7to11: boolean }>,
  rules: Rules
): Promise<SelectionResult<string>> {
  if (snippets.length === 0) {
    return { value: "", mode: "exploit" };
  }
  const pools = new Map<string, string[]>();
  for (const snippet of snippets) {
    const strategy = snippet.moment3to7
      ? "moment_3_7"
      : snippet.moment7to11
      ? "moment_7_11"
      : "any";
    const existing = pools.get(strategy) ?? [];
    existing.push(snippet.id);
    pools.set(strategy, existing);
  }
  const strategyIds = [...pools.keys()];
  const selected = await selectArm(
    "SNIPPET_STRATEGY",
    strategyIds,
    rules.optimiser_policy.media_exploration_budget ?? rules.optimiser_policy.exploration_budget,
    rules.optimiser_policy.prior_mean,
    rules.optimiser_policy.prior_weight,
    rules.optimiser_policy.media_min_pulls_before_exploit ??
      rules.optimiser_policy.min_pulls_before_promote
  );
  const strategy = selected?.id ?? pickRandom(strategyIds);
  const pool = pools.get(strategy) ?? snippets.map((snippet) => snippet.id);
  return {
    value: pickRandom(pool),
    mode: selected?.mode ?? "exploit"
  };
}

export async function selectClip(clipIds: string[], rules: Rules): Promise<SelectionResult<string>> {
  if (clipIds.length === 0) {
    return { value: "", mode: "exploit" };
  }
  const selected = await selectArm(
    "CLIP",
    clipIds,
    rules.optimiser_policy.media_exploration_budget ?? rules.optimiser_policy.exploration_budget,
    rules.optimiser_policy.prior_mean,
    rules.optimiser_policy.prior_weight,
    rules.optimiser_policy.media_min_pulls_before_exploit ??
      rules.optimiser_policy.min_pulls_before_promote
  );
  return {
    value: selected?.id ?? pickRandom(clipIds),
    mode: selected?.mode ?? "exploit"
  };
}

export async function selectRecipe(recipeIds: string[], rules: Rules): Promise<SelectionResult<string>> {
  const recipes = await prisma.hookRecipe.findMany({ where: { id: { in: recipeIds } } });
  const locked = recipes.filter((recipe) => recipe.locked).map((recipe) => recipe.id);
  const unlocked = recipeIds.filter((id) => !locked.includes(id));
  
  const lockedPick = pickLocked(locked, unlocked, rules.optimiser_policy.max_locked_share);
  if (lockedPick) return lockedPick;
  if (!rules.optimiser_policy.test_dimensions.recipe) {
    return { value: pickRandom(unlocked), mode: "exploit" };
  }
  const selected = await selectArm(
    "RECIPE",
    unlocked,
    rules.optimiser_policy.exploration_budget,
    rules.optimiser_policy.prior_mean,
    rules.optimiser_policy.prior_weight,
    rules.optimiser_policy.min_pulls_before_promote,
    undefined
  );
  return {
    value: selected?.id ?? pickRandom(unlocked),
    mode: selected?.mode ?? "exploit"
  };
}

export async function selectCta(allowedIntents: string[], rules: Rules) {
  await ensureDefaultCtas();
  const ctas = await prisma.cta.findMany({
    where: { status: { in: ["active", "testing"] }, intent: { in: allowedIntents } }
  });
  if (ctas.length === 0) return null;
  const locked = ctas.filter((cta) => cta.locked);
  const unlocked = ctas.filter((cta) => !cta.locked);
  const lockedPick = pickLocked(locked, unlocked, rules.optimiser_policy.max_locked_share);
  if (lockedPick) return { value: lockedPick.value, mode: lockedPick.mode };
  if (!rules.optimiser_policy.test_dimensions.cta) {
    return { value: pickRandom(unlocked), mode: "exploit" };
  }
  const selected = await selectArm(
    "CTA",
    unlocked.map((cta) => cta.id),
    rules.optimiser_policy.exploration_budget,
    rules.optimiser_policy.prior_mean,
    rules.optimiser_policy.prior_weight,
    rules.optimiser_policy.min_pulls_before_promote
  );
  const selectedCta = unlocked.find((cta) => cta.id === selected?.id) ?? pickRandom(unlocked);
  return { value: selectedCta, mode: selected?.mode ?? "exploit" };
}

export async function selectVariant(params: {
  recipeId: string;
  recipeBeat1: unknown;
  recipeBeat2: unknown;
  ctaId?: string | null;
  rules: Rules;
}): Promise<SelectionResult<Awaited<ReturnType<typeof prisma.variant.create>>> | null> {
  const variants = await prisma.variant.findMany({
    where: { recipeId: params.recipeId, status: { in: ["active", "testing"] } }
  });
  const locked = variants.filter((variant) => variant.locked);
  const matching = params.ctaId
    ? variants.filter((variant) => variant.ctaId === params.ctaId)
    : variants;
  const unlockedBase = matching.length ? matching : variants;
  const unlocked = unlockedBase.filter((variant) => !variant.locked);
  const lockedPick = pickLocked(locked, unlocked, params.rules.optimiser_policy.max_locked_share);
  if (lockedPick) return lockedPick as SelectionResult<typeof variants[number]>;
  if (unlocked.length > 0) {
    if (!params.rules.optimiser_policy.test_dimensions.variant) {
      return { value: pickRandom(unlocked), mode: "exploit" };
    }
    const selected = await selectArm(
      "VARIANT",
      unlocked.map((variant) => variant.id),
      params.rules.optimiser_policy.exploration_budget,
      params.rules.optimiser_policy.prior_mean,
      params.rules.optimiser_policy.prior_weight,
      params.rules.optimiser_policy.min_pulls_before_promote
    );
    return {
      value: unlocked.find((variant) => variant.id === selected?.id) ?? pickRandom(unlocked),
      mode: selected?.mode ?? "exploit"
    };
  }
  const beat1 = pickTemplate(params.recipeBeat1);
  const beat2 = pickTemplate(params.recipeBeat2);
  if (!isBeatValid(beat1, beat2, params.rules)) return null;
  const created = await prisma.variant.create({
    data: {
      recipeId: params.recipeId,
      beat1,
      beat2,
      ctaId: params.ctaId ?? null,
      status: "active",
      createdBy: "system"
    }
  });
  return { value: created, mode: "exploit" };
}
