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

const isBeatValid = (beat1: string, beat2: string, rules: Rules) => {
  if (beat1.includes("\n") || beat2.includes("\n")) return false;
  const combined = normalize(`${beat1} ${beat2}`);
  if (rules.guardrails.banned_words.some((word) => combined.includes(word))) {
    return false;
  }
  if (rules.guardrails.banned_phrases.some((phrase) => combined.includes(phrase))) {
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

export const buildCaption = (rules: Rules) => {
  let caption = "Draft caption placeholder";
  if (rules.caption_topic_keywords.length > 0) {
    caption = `${pickRandom(rules.caption_topic_keywords)} ${caption}`.trim();
  }
  if (rules.caption_hashtags.length > 0) {
    caption = `${caption} ${rules.caption_hashtags.slice(0, 3).join(" ")}`.trim();
  }
  if (rules.caption_marker_enabled) {
    const suffix = Math.random().toString(36).slice(2, 8);
    caption = `${caption} ${rules.caption_marker_prefix}${suffix}`.trim();
  }
  return caption;
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

export async function selectSnippet(snippetIds: string[], rules: Rules): Promise<SelectionResult<string>> {
  if (snippetIds.length === 0) {
    return { value: "", mode: "exploit" };
  }
  const selected = await selectArm(
    "SNIPPET",
    snippetIds,
    rules.optimiser_policy.media_exploration_budget ?? rules.optimiser_policy.exploration_budget,
    rules.optimiser_policy.prior_mean,
    rules.optimiser_policy.prior_weight,
    rules.optimiser_policy.media_min_pulls_before_exploit ??
      rules.optimiser_policy.min_pulls_before_promote
  );
  return {
    value: selected?.id ?? pickRandom(snippetIds),
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
  const boosts: Record<string, { extraWeight: number; maxPulls: number }> = {};
  if (rules.optimiser_policy.inspo_seed_enabled) {
    for (const recipe of recipes) {
      if (recipe.source === "inspo") {
        boosts[recipe.id] = {
          extraWeight: rules.optimiser_policy.inspo_seed_weight,
          maxPulls: rules.optimiser_policy.inspo_seed_max_pulls
        };
      }
    }
  }
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
    boosts
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
