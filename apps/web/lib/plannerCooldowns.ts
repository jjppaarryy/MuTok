import { DateTime } from "luxon";
import { prisma } from "./prisma";
import type { RulesSettings } from "./rulesConfig";
import { getSnippetStyle, isCommentCta, pickFixedBeat } from "./plannerCoreHelpers";

type Recipe = Awaited<ReturnType<typeof prisma.hookRecipe.findMany>>[number];
type Snippet = Awaited<ReturnType<typeof prisma.snippet.findMany>>[number];

export type CooldownState = {
  recentRecipeIds: Set<string>;
  relaxedRecipeIds: Set<string>;
  recentSnippetIds: Set<string>;
  recentClipIds: Set<string>;
  recentBeat1: Set<string>;
  recentBeat2: Set<string>;
  recentBeat1Prefixes: Set<string>;
  recentCaptions: Set<string>;
  recentTrackIds: Set<string>;
  recentMontageTemplates: Set<string>;
  hookFamilyDayCounts: Map<string, number>;
  hookFamilyWeekCounts: Map<string, number>;
  antiAlgoWeekCount: number;
  recentCtaIntents: string[];
  snippetStyleDayCounts: Map<string, number>;
  todayCommentCtaCount: number;
};

const normalizeLine = (text: string) => text.trim().toLowerCase();

const firstWords = (text: string, count: number) => {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.slice(0, count).join(" ");
};

const isWithinDays = (date: Date, days: number) => {
  const cutoff = DateTime.local().minus({ days }).toJSDate();
  return date >= cutoff;
};

const isWithinHours = (date: Date, hours: number) => {
  const cutoff = DateTime.local().minus({ hours }).toJSDate();
  return date >= cutoff;
};

const addCount = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const isAntiAlgoText = (text: string) => {
  const normalized = normalizeLine(text);
  return (
    normalized.includes("algo") ||
    normalized.includes("algorithm") ||
    normalized.includes("not trending") ||
    normalized.includes("not pushed")
  );
};

export const buildCooldownState = async (
  rules: RulesSettings,
  recipeById: Map<string, Recipe>,
  snippetById: Map<string, Snippet>
): Promise<CooldownState> => {
  const spam = rules.spam_guardrails;
  const maxHours = Math.max(
    spam.snippet_cooldown_hours,
    spam.clip_cooldown_hours,
    spam.track_cooldown_hours,
    spam.montage_template_cooldown_hours
  );
  const maxDays = Math.max(
    spam.recipe_cooldown_days,
    spam.beat1_exact_cooldown_days,
    spam.beat2_exact_cooldown_days,
    spam.caption_exact_cooldown_days,
    spam.beat1_prefix_cooldown_days,
    7,
    Math.ceil(maxHours / 24)
  );
  const earliest = DateTime.local().minus({ days: maxDays }).toJSDate();
  const plans = await prisma.postPlan.findMany({
    where: {
      scheduledFor: { gte: earliest },
      status: { not: "FAILED" }
    },
    orderBy: { scheduledFor: "desc" },
    select: {
      scheduledFor: true,
      recipeId: true,
      snippetId: true,
      clipIds: true,
      onscreenText: true,
      caption: true,
      trackId: true,
      container: true,
      hookFamily: true
    }
  });

  const recentRecipeIds = new Set<string>();
  const relaxedRecipeIds = new Set<string>();
  const recentSnippetIds = new Set<string>();
  const recentClipIds = new Set<string>();
  const recentBeat1 = new Set<string>();
  const recentBeat2 = new Set<string>();
  const recentBeat1Prefixes = new Set<string>();
  const recentCaptions = new Set<string>();
  const recentTrackIds = new Set<string>();
  const recentMontageTemplates = new Set<string>();
  const hookFamilyDayCounts = new Map<string, number>();
  const hookFamilyWeekCounts = new Map<string, number>();
  const snippetStyleDayCounts = new Map<string, number>();
  const recentCtaIntents: string[] = [];
  let antiAlgoWeekCount = 0;
  let todayCommentCtaCount = 0;

  for (const plan of plans) {
    const scheduledFor = plan.scheduledFor;
    if (plan.recipeId) {
      if (isWithinDays(scheduledFor, spam.recipe_cooldown_days)) {
        recentRecipeIds.add(plan.recipeId);
        relaxedRecipeIds.add(plan.recipeId);
      }
      const recipe = recipeById.get(plan.recipeId);
      if (recipe && recentCtaIntents.length < spam.max_same_cta_intent_in_row + 2) {
        recentCtaIntents.push(recipe.ctaType);
      }
      if (recipe && isCommentCta(recipe.ctaType) && isWithinDays(scheduledFor, 1)) {
        todayCommentCtaCount += 1;
      }
    }
    if (plan.hookFamily) {
      if (isWithinDays(scheduledFor, 1)) {
        addCount(hookFamilyDayCounts, plan.hookFamily);
      }
      if (isWithinDays(scheduledFor, 7)) {
        addCount(hookFamilyWeekCounts, plan.hookFamily);
        if (isAntiAlgoText(plan.hookFamily)) {
          antiAlgoWeekCount += 1;
        }
      }
    }
    if (plan.snippetId && isWithinHours(scheduledFor, spam.snippet_cooldown_hours)) {
      recentSnippetIds.add(plan.snippetId);
    }
    if (plan.trackId && isWithinHours(scheduledFor, spam.track_cooldown_hours)) {
      recentTrackIds.add(plan.trackId);
    }
    const clipIds = Array.isArray(plan.clipIds) ? (plan.clipIds as string[]) : [];
    if (clipIds.length > 0 && isWithinHours(scheduledFor, spam.clip_cooldown_hours)) {
      for (const clipId of clipIds) {
        recentClipIds.add(clipId);
      }
    }
    if (plan.container === "montage" && clipIds.length > 0) {
      const signature = clipIds.join("|");
      if (isWithinHours(scheduledFor, spam.montage_template_cooldown_hours)) {
        recentMontageTemplates.add(signature);
      }
    }
    if (typeof plan.onscreenText === "string") {
      const [beat1, beat2] = plan.onscreenText.split("\n");
      if (beat1 && isWithinDays(scheduledFor, spam.beat1_exact_cooldown_days)) {
        recentBeat1.add(normalizeLine(beat1));
      }
      if (beat1 && isWithinDays(scheduledFor, spam.beat1_prefix_cooldown_days)) {
        recentBeat1Prefixes.add(firstWords(beat1, spam.beat1_prefix_words));
      }
      if (beat2 && isWithinDays(scheduledFor, spam.beat2_exact_cooldown_days)) {
        recentBeat2.add(normalizeLine(beat2));
      }
    }
    if (typeof plan.caption === "string" && isWithinDays(scheduledFor, spam.caption_exact_cooldown_days)) {
      recentCaptions.add(normalizeLine(plan.caption));
      if (isAntiAlgoText(plan.caption)) {
        antiAlgoWeekCount += 1;
      }
    }
    if (plan.snippetId && isWithinDays(scheduledFor, 1)) {
      const snippet = snippetById.get(plan.snippetId);
      if (snippet) {
        addCount(snippetStyleDayCounts, getSnippetStyle(snippet));
      }
    }
  }

  return {
    recentRecipeIds,
    relaxedRecipeIds,
    recentSnippetIds,
    recentClipIds,
    recentBeat1,
    recentBeat2,
    recentBeat1Prefixes,
    recentCaptions,
    recentTrackIds,
    recentMontageTemplates,
    hookFamilyDayCounts,
    hookFamilyWeekCounts,
    antiAlgoWeekCount,
    recentCtaIntents,
    snippetStyleDayCounts,
    todayCommentCtaCount
  };
};

export const filterRecipesByCooldown = (
  rules: RulesSettings,
  recipes: Recipe[],
  cooldown: CooldownState
) => {
  const spam = rules.spam_guardrails;
  const filterFor = (
    recipeIds: Set<string>,
    relaxPrefix = false,
    relaxAntiAlgo = false,
    relaxCta = false
  ) =>
    recipes.filter((recipe) => {
      if (recipeIds.has(recipe.id)) return false;
      if (cooldown.todayCommentCtaCount >= spam.max_comment_cta_per_day && isCommentCta(recipe.ctaType)) {
        return false;
      }
      const beat1 = pickFixedBeat(recipe.beat1Templates);
      const beat2 = pickFixedBeat(recipe.beat2Templates);
      if (!beat1 || !beat2) return false;
      if (cooldown.recentBeat1.has(normalizeLine(beat1))) return false;
      if (cooldown.recentBeat2.has(normalizeLine(beat2))) return false;
      if (!relaxPrefix && cooldown.recentBeat1Prefixes.has(firstWords(beat1, spam.beat1_prefix_words))) {
        return false;
      }
      const caption = recipe.captionTemplate?.trim() ?? "";
      if (!caption || cooldown.recentCaptions.has(normalizeLine(caption))) return false;
      const hookFamily = recipe.name;
      const dayCount = cooldown.hookFamilyDayCounts.get(hookFamily) ?? 0;
      const weekCount = cooldown.hookFamilyWeekCounts.get(hookFamily) ?? 0;
      if (dayCount >= spam.max_hook_family_per_day) return false;
      if (weekCount >= spam.max_hook_family_per_week) return false;
      if (
        !relaxAntiAlgo &&
        isAntiAlgoText(`${recipe.name} ${beat1} ${caption}`) &&
        cooldown.antiAlgoWeekCount >= spam.max_anti_algo_per_week
      ) return false;
      if (!relaxCta) {
        const streak = cooldown.recentCtaIntents;
        if (streak.length >= spam.max_same_cta_intent_in_row) {
          const recent = streak.slice(0, spam.max_same_cta_intent_in_row);
          if (recent.every((intent) => intent === recipe.ctaType)) return false;
        }
      }
      return true;
    });

  const strict = filterFor(cooldown.recentRecipeIds);
  if (strict.length > 0) {
    return { recipes: strict, relaxed: false, relaxedPrefix: false };
  }
  const relaxed = filterFor(cooldown.relaxedRecipeIds);
  if (relaxed.length > 0) {
    return { recipes: relaxed, relaxed: true, relaxedPrefix: false };
  }
  const relaxedPrefix = filterFor(cooldown.relaxedRecipeIds, true);
  if (relaxedPrefix.length > 0) {
    return { recipes: relaxedPrefix, relaxed: true, relaxedPrefix: true, relaxedAntiAlgo: false };
  }
  const relaxedAntiAlgo = filterFor(cooldown.relaxedRecipeIds, true, true);
  if (relaxedAntiAlgo.length > 0) {
    return {
      recipes: relaxedAntiAlgo,
      relaxed: true,
      relaxedPrefix: true,
      relaxedAntiAlgo: true,
      relaxedCta: false
    };
  }
  const relaxedCta = filterFor(cooldown.relaxedRecipeIds, true, true, true);
  return {
    recipes: relaxedCta,
    relaxed: true,
    relaxedPrefix: true,
    relaxedAntiAlgo: true,
    relaxedCta: true
  };
};

export const filterSnippetsByCooldown = (
  rules: RulesSettings,
  snippets: Snippet[],
  cooldown: CooldownState
) => {
  const spam = rules.spam_guardrails;
  const strict = snippets.filter((snippet) => {
    if (cooldown.recentSnippetIds.has(snippet.id)) return false;
    if (cooldown.recentTrackIds.has(snippet.trackId)) return false;
    const style = getSnippetStyle(snippet);
    const count = cooldown.snippetStyleDayCounts.get(style) ?? 0;
    if (count >= spam.max_snippet_style_per_day) return false;
    return true;
  });
  if (strict.length > 0) {
    return { snippets: strict, relaxed: false };
  }
  return { snippets, relaxed: true };
};
