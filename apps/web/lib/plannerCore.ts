import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";
import { getEnabledHookRecipes } from "./hookRecipes";
import { pickRandom, safeCategories } from "./plannerUtils";
import { normalizeClipCategory } from "./clipCategories";
import { recordArmUse } from "./optimizer";
import { logRunEvent } from "./logs";
import { buildClipSet, buildOnscreenAndCaption, evaluateCompatibility, isMontageTemplateBlocked } from "./plannerCoreUtils";
import { getRecoveryStatus } from "./recoveryMode";
import { applyRecoveryRules } from "./plannerRecovery";
import { selectContainer, selectRecipe, selectSnippet } from "./planSelection";
import { getTodayContainerCounts, getSnippetStyle, getSnippetStrategy, isCommentCta, pickContainerForSlot, pickFixedBeat, updateContainerCounts } from "./plannerCoreHelpers";
import { buildCooldownState, filterRecipesByCooldown, filterSnippetsByCooldown } from "./plannerCooldowns";
type PlanResult = { createdIds: string[]; warnings: string[] };
const isAntiAlgoText = (text: string) => {
  const normalized = text.toLowerCase();
  return normalized.includes("algo") || normalized.includes("algorithm") || normalized.includes("not trending") || normalized.includes("not pushed");
};
export async function buildPlans(
  count: number,
  options?: { scheduledFor?: Date }
): Promise<PlanResult> {
  const warnings: string[] = [];
  const createdIds: string[] = [];
  const baseRules = await getRulesSettings();
  const recovery = await getRecoveryStatus(baseRules);
  const rules = applyRecoveryRules(baseRules, recovery);
  if (recovery.active) warnings.push("Recovery mode active: cadence and CTAs limited.");
  const clips = await prisma.clip.findMany({
    include: { clipSetItems: true },
    orderBy: { createdAt: "desc" }
  });
  const snippets = await prisma.snippet.findMany({ where: { approved: true } });
  const tracks = await prisma.track.findMany();
  if (clips.length === 0) {
    console.warn("[planner] No clips available.");
    return { createdIds, warnings: ["No clips available."] };
  }
  if (snippets.length === 0) {
    console.warn("[planner] No approved snippets available.");
    return { createdIds, warnings: ["No approved snippets available."] };
  }
  if (tracks.length === 0) {
    console.warn("[planner] No tracks available.");
    return { createdIds, warnings: ["No tracks available."] };
  }
  const viral = rules.viral_engine;
  const eligibleSnippets = snippets.filter((snippet) => {
    if (viral.require_moment_3_to_7 && !snippet.moment3to7) return false;
    if (viral.require_second_moment_7_to_11 && !snippet.moment7to11) return false;
    return true;
  });
  if (eligibleSnippets.length === 0) {
    console.warn("[planner] No snippets meet Viral Engine moment rules.");
    return { createdIds, warnings: ["No snippets meet Viral Engine moment rules."] };
  }
  const montageEligible = clips.filter((clip) => {
    if (!rules.guardrails.allow_sync_critical && clip.sync === "critical") return false;
    return true;
  });
  const safeClips = clips.filter((clip) => safeCategories.includes(normalizeClipCategory(clip.category)));
  const containers = rules.allowed_containers.length ? rules.allowed_containers : ["static_daw"];
  const recipes = await getEnabledHookRecipes();
  if (recipes.length === 0) {
    console.warn("[planner] No hook recipes enabled.");
    const result = { createdIds, warnings: ["No hook recipes enabled."] };
    return result;
  }
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const snippetById = new Map(snippets.map((snippet) => [snippet.id, snippet]));
  const cooldownState = await buildCooldownState(rules, recipeById, snippetById);
  const eligibleMontageClips = montageEligible.filter(
    (clip) => !cooldownState.recentClipIds.has(clip.id)
  );
  const eligibleSafeClips = safeClips.filter(
    (clip) => !cooldownState.recentClipIds.has(clip.id)
  );
  let todayContainerCounts = await getTodayContainerCounts();
  let todayCommentCtaCount = cooldownState.todayCommentCtaCount;
  for (let i = 0; i < count; i += 1) {
    const planWarnings: string[] = [];
    if (recovery.active) {
      planWarnings.push("Recovery mode active: cadence and CTAs limited.");
    }
    const containerSelection = await selectContainer(containers, rules);
    const preferredContainer = pickContainerForSlot(todayContainerCounts);
    let containerRelaxed = false;
    let container =
      containers.includes(preferredContainer) ? preferredContainer : containerSelection.value;
    const clipSelection = await buildClipSet({
      container,
      containers,
      rules,
      eligibleMontageClips,
      eligibleSafeClips,
      clips
    });
    container = clipSelection.container;
    containerRelaxed = clipSelection.containerRelaxed;
    if (containerRelaxed) {
      const msg = "Container selection relaxed.";
      warnings.push(msg);
      planWarnings.push(msg);
    }
    if (clipSelection.warning) {
      console.warn(`[planner] ${clipSelection.warning}`);
      warnings.push(clipSelection.warning);
      if (clipSelection.warning.includes("clip cap reached")) {
        planWarnings.push(clipSelection.warning);
      } else {
        continue;
      }
    }
    let clipSet = clipSelection.clipSet;
    cooldownState.todayCommentCtaCount = todayCommentCtaCount;
    const recipeFilter = filterRecipesByCooldown(rules, recipes, cooldownState);
    if (recipeFilter.recipes.length === 0) {
      const msg = "No eligible recipes after cooldown filters.";
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    if (recipeFilter.relaxedPrefix) {
      warnings.push("Beat1 prefix cooldown relaxed.");
      planWarnings.push("Beat1 prefix cooldown relaxed.");
    }
    if (recipeFilter.relaxedAntiAlgo) {
      warnings.push("Anti-algo cap relaxed.");
      planWarnings.push("Anti-algo cap relaxed.");
    }
    if (recipeFilter.relaxedCta) {
      warnings.push("CTA streak cap relaxed.");
      planWarnings.push("CTA streak cap relaxed.");
    }
    const allowedCtas = Array.isArray(viral.allowed_cta_types) ? viral.allowed_cta_types : [];
    let recipePool = recipeFilter.recipes;
    let enforceCta = false;
    if (allowedCtas.length > 0) {
      const filteredByCta = recipePool.filter((recipe) => allowedCtas.includes(recipe.ctaType));
      if (filteredByCta.length > 0) {
        recipePool = filteredByCta;
        enforceCta = true;
      } else {
        const msg = "No recipes match Viral Engine CTA list. Ignoring CTA filter.";
        console.warn(`[planner] ${msg}`);
        warnings.push(msg);
        planWarnings.push(msg);
      }
    }
    const recipeSelection = await selectRecipe(recipePool.map((recipe) => recipe.id), rules);
    const selectedRecipe = recipePool.find((recipe) => recipe.id === recipeSelection.value) ?? recipePool[0];
    const disallowedContainers = Array.isArray(selectedRecipe.disallowedContainers)
      ? (selectedRecipe.disallowedContainers as string[])
      : [];
    if (disallowedContainers.includes(container)) {
      const msg = `Recipe disallows container ${container}.`;
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    if (enforceCta && !allowedCtas.includes(selectedRecipe.ctaType)) {
      const msg = "Recipe CTA not allowed by Viral Engine.";
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    const allowedSnippetTypes = Array.isArray(selectedRecipe.allowedSnippetTypes)
      ? (selectedRecipe.allowedSnippetTypes as string[])
      : [];
    const eligibleForRecipe = eligibleSnippets.filter((snippet) => {
      if (allowedSnippetTypes.includes("moment_3_7") && !snippet.moment3to7) {
        return false;
      }
      if (allowedSnippetTypes.includes("moment_7_11") && !snippet.moment7to11) {
        return false;
      }
      return true;
    });
    let snippetPool = eligibleForRecipe.length ? eligibleForRecipe : eligibleSnippets;
    const snippetFilter = filterSnippetsByCooldown(rules, snippetPool, cooldownState);
    snippetPool = snippetFilter.snippets;
    if (snippetFilter.relaxed) {
      warnings.push("Snippet cooldown relaxed.");
      planWarnings.push("Snippet cooldown relaxed.");
    }
    const snippetSelection = await selectSnippet(
      snippetPool.map((item) => ({ id: item.id, moment3to7: item.moment3to7, moment7to11: item.moment7to11 })),
      rules
    );
    const snippet = snippetPool.find((item) => item.id === snippetSelection.value) ?? pickRandom(snippetPool);
    const track = tracks.find((item) => item.id === snippet.trackId);
    if (!track) {
      const msg = "Snippet missing track reference.";
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    if (container === "montage" && clipSet.length > 0 && snippet.durationSec) {
      const [minDur, maxDur] = rules.montage.clip_duration_range;
      const effectiveMaxDur = minDur + Math.random() * Math.max(0.01, maxDur - minDur);
      const montageMax = rules.montage.clip_count_max ?? rules.montage.clip_count;
      const clipUsable = (dur?: number | null) =>
        dur && dur > 0 ? Math.min(dur, effectiveMaxDur) : effectiveMaxDur;
      let usableDur = clipSet.reduce(
        (sum, c) => sum + clipUsable(c.durationSec),
        0
      );
      if (usableDur < snippet.durationSec) {
        let remainingPool = eligibleMontageClips.filter(
          (c) => !clipSet.some((x) => x.id === c.id)
        );
        while (
          usableDur < snippet.durationSec &&
          remainingPool.length > 0 &&
          clipSet.length < montageMax
        ) {
          const picked = pickRandom(remainingPool);
          clipSet = [...clipSet, picked];
          usableDur += clipUsable(picked.durationSec);
          remainingPool = remainingPool.filter((c) => c.id !== picked.id);
        }
        if (usableDur < snippet.durationSec) {
          const msg = "Montage clip cap reached before covering snippet.";
          warnings.push(msg);
          planWarnings.push(msg);
        }
      }
    }
    if (container !== "montage" && clipSet.length > 0 && snippet.durationSec) {
      const maxStaticDawClips = 3;
      const clipUsable = (dur?: number | null) => (dur && dur > 0 ? dur : 0);
      let totalDur = clipSet.reduce(
        (sum, c) => sum + clipUsable(c.durationSec),
        0
      );
      if (totalDur < snippet.durationSec) {
        let remainingPool = eligibleMontageClips.filter(
          (c) => !clipSet.some((x) => x.id === c.id)
        );
        while (
          totalDur < snippet.durationSec &&
          remainingPool.length > 0 &&
          clipSet.length < maxStaticDawClips
        ) {
          const picked = pickRandom(remainingPool);
          clipSet = [...clipSet, picked];
          totalDur += clipUsable(picked.durationSec);
          remainingPool = remainingPool.filter((c) => c.id !== picked.id);
        }
        if (totalDur < snippet.durationSec) {
          const msg = "Static DAW clip cap reached before covering snippet.";
          warnings.push(msg);
          planWarnings.push(msg);
        }
      }
    }
    const { blocked, score, reasons } = evaluateCompatibility(clipSet, snippet, rules);
    const beat1 = pickFixedBeat(selectedRecipe.beat1Templates);
    const beat2 = pickFixedBeat(selectedRecipe.beat2Templates);
    const textResult = buildOnscreenAndCaption({
      beat1,
      beat2,
      captionTemplate: selectedRecipe.captionTemplate,
      rules
    });
    if (textResult.warning) {
      console.warn(`[planner] ${textResult.warning}`);
      warnings.push(textResult.warning);
      planWarnings.push(textResult.warning);
      if (!textResult.onscreenText || !textResult.caption) {
        continue;
      }
    }
    if (isMontageTemplateBlocked(container, clipSet, cooldownState)) {
      const msg = "Montage template cooldown active.";
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    const onscreenText = textResult.onscreenText!;
    const caption = textResult.caption!;
    if (blocked || score < rules.min_compatibility_score - 0.001) {
      const msg = `Clip set + snippet ${snippet.id} below compatibility (score: ${score.toFixed(2)}, min: ${rules.min_compatibility_score})`;
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    const plan = await prisma.postPlan.create({
      data: {
        scheduledFor: options?.scheduledFor ?? new Date(),
        container,
        clipIds: clipSet.map((clip) => clip.id),
        trackId: track.id,
        snippetId: snippet.id,
        snippetStartSec: snippet.startSec,
        snippetDurationSec: snippet.durationSec,
        onscreenText,
        caption,
        hookFamily: selectedRecipe.name,
        recipeId: selectedRecipe.id,
        variantId: null,
        ctaId: null,
        experimentFlags: {
          cooldown_relaxed:
            recipeFilter.relaxed || snippetFilter.relaxed || containerRelaxed,
          snippet_relaxed: snippetFilter.relaxed,
          container_relaxed: containerRelaxed,
          tested_recipe: rules.optimiser_policy.test_dimensions.recipe,
          tested_container: rules.optimiser_policy.test_dimensions.container,
          warnings: planWarnings,
          comparisonMode: false,
          optionsCount: 1,
          selection: {
            recipe: recipeSelection.mode,
            container: containerSelection.mode
          }
        },
        compatibilityScore: score,
        reasons,
        status: "PLANNED"
      }
    });
    await recordArmUse("RECIPE", selectedRecipe.id);
    await recordArmUse("CONTAINER", container);
    await recordArmUse("SNIPPET_STRATEGY", getSnippetStrategy(snippet));
    for (const clip of clipSet) {
      await recordArmUse("CLIP_CATEGORY", clip.category);
    }
    createdIds.push(plan.id);
    todayContainerCounts = updateContainerCounts(todayContainerCounts, container);
    if (isCommentCta(selectedRecipe.ctaType)) {
      todayCommentCtaCount += 1;
    }
    cooldownState.recentRecipeIds.add(selectedRecipe.id);
    cooldownState.recentSnippetIds.add(snippet.id);
    cooldownState.recentTrackIds.add(track.id);
    for (const clip of clipSet) {
      cooldownState.recentClipIds.add(clip.id);
    }
    if (container === "montage") {
      cooldownState.recentMontageTemplates.add(clipSet.map((clip) => clip.id).join("|"));
    }
    cooldownState.recentCtaIntents.unshift(selectedRecipe.ctaType);
    cooldownState.recentCtaIntents.splice(rules.spam_guardrails.max_same_cta_intent_in_row + 2);
    cooldownState.hookFamilyDayCounts.set(
      selectedRecipe.name,
      (cooldownState.hookFamilyDayCounts.get(selectedRecipe.name) ?? 0) + 1
    );
    cooldownState.hookFamilyWeekCounts.set(
      selectedRecipe.name,
      (cooldownState.hookFamilyWeekCounts.get(selectedRecipe.name) ?? 0) + 1
    );
    if (isAntiAlgoText(`${selectedRecipe.name} ${beat1} ${caption}`)) {
      cooldownState.antiAlgoWeekCount += 1;
    }
    cooldownState.recentCaptions.add(caption.toLowerCase());
    cooldownState.recentBeat1.add(beat1.toLowerCase());
    cooldownState.recentBeat2.add(beat2.toLowerCase());
    cooldownState.recentBeat1Prefixes.add(beat1.split(/\s+/).slice(0, rules.spam_guardrails.beat1_prefix_words).join(" ").toLowerCase());
    const style = getSnippetStyle(snippet);
    cooldownState.snippetStyleDayCounts.set(
      style,
      (cooldownState.snippetStyleDayCounts.get(style) ?? 0) + 1
    );
  }
  if (warnings.length > 0) {
    await logRunEvent({
      runType: "planner_guardrails",
      status: "WARN",
      payloadExcerpt: `warnings=${warnings.length}`
    });
  }
  return { createdIds, warnings };
}
