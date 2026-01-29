import { prisma } from "./prisma";
import { computeCompatibility } from "../../../packages/core/src/scoring";
import { getRulesSettings } from "./settings";
import { getEnabledHookRecipes } from "./hookRecipes";
import { pickMany, pickRandom, safeCategories } from "./plannerUtils";
import { recordArmUse } from "./optimizer";
import { logRunEvent } from "./logs";
import { maybeTriggerMutations } from "./optimiserSignals";
import { getConfig } from "./config";
import {
  buildCaption,
  selectClip,
  selectContainer,
  selectCta,
  selectRecipe,
  selectSnippet,
  selectVariant
} from "./planSelection";
import { ensureTwoBeat } from "./brainRepair";

type PlanResult = { createdIds: string[]; warnings: string[] };
export async function buildPlans(
  count: number,
  options?: { scheduledFor?: Date }
): Promise<PlanResult> {
  const warnings: string[] = [];
  const createdIds: string[] = [];
  let fallbackPlan: null | {
    container: string;
    clipIds: string[];
    trackId: string;
    snippetId: string;
    snippetStartSec: number;
    snippetDurationSec: number;
    onscreenText: string;
    caption: string;
    hookFamily: string;
    recipeId: string;
    variantId: string;
    ctaId: string | null;
    compatibilityScore: number;
    reasons: string[];
  } = null;
  const openAiApiKey = await getConfig("OPENAI_API_KEY");
  const rules = await getRulesSettings();
  const clips = await prisma.clip.findMany({ orderBy: { createdAt: "desc" } });
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
    if (!rules.guardrails.allow_hands_keys_literal && clip.category === "Hands_keys_literal") {
      return false;
    }
    return true;
  });
  const safeClips = clips.filter((clip) => safeCategories.includes(clip.category));
  const containers = rules.allowed_containers.length ? rules.allowed_containers : ["static_daw"];
  const recipes = await getEnabledHookRecipes();
  if (recipes.length === 0) {
    console.warn("[planner] No hook recipes enabled.");
    return { createdIds, warnings: ["No hook recipes enabled."] };
  }
  await maybeTriggerMutations({
    recipes,
    allowedIntents: viral.allowed_cta_types,
    rules
  });
  for (let i = 0; i < count; i += 1) {
    const containerSelection = await selectContainer(containers, rules);
    let container = containerSelection.value;
    let clipSet: typeof clips = [];
    if (container === "montage" && montageEligible.length < rules.montage.clip_count) {
      if (containers.includes("static_daw")) {
        container = "static_daw";
      } else {
        const msg = "Not enough eligible clips for montage.";
        console.warn(`[planner] ${msg}`);
        warnings.push(msg);
        continue;
      }
    }
    if (container === "montage") {
      const dawAnchors = montageEligible.filter((clip) => clip.category === "DAW_screen");
      let firstClip = null as typeof montageEligible[number] | null;
      if (dawAnchors.length > 0) {
        const selection = await selectClip(dawAnchors.map((clip) => clip.id), rules);
        firstClip = dawAnchors.find((clip) => clip.id === selection.value) ?? pickRandom(dawAnchors);
      }
      const remainingPool = montageEligible.filter((clip) => clip.id !== firstClip?.id);
      const neededClips = Math.max(0, rules.montage.clip_count - (firstClip ? 1 : 0));
      const rest: typeof montageEligible = [];
      let pool = [...remainingPool];
      while (pool.length > 0 && rest.length < neededClips) {
        const selection = await selectClip(pool.map((clip) => clip.id), rules);
        const picked = pool.find((clip) => clip.id === selection.value) ?? pickRandom(pool);
        rest.push(picked);
        pool = pool.filter((clip) => clip.id !== picked.id);
      }
      clipSet = firstClip ? [firstClip, ...rest] : rest;
    } else {
      const basePool = safeClips.length ? safeClips : clips;
      const selection = await selectClip(basePool.map((clip) => clip.id), rules);
      const picked = basePool.find((clip) => clip.id === selection.value) ?? pickRandom(basePool);
      clipSet = picked ? [picked] : [];
    }
    if (clipSet.length === 0) {
      const msg = "No eligible clips for container.";
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    const recipeSelection = await selectRecipe(recipes.map((recipe) => recipe.id), rules);
    const selectedRecipe = recipes.find((recipe) => recipe.id === recipeSelection.value) ?? recipes[0];
    const disallowedContainers = Array.isArray(selectedRecipe.disallowedContainers)
      ? (selectedRecipe.disallowedContainers as string[])
      : [];
    if (disallowedContainers.includes(container)) {
      const msg = `Recipe disallows container ${container}.`;
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    if (
      viral.allowed_cta_types.length > 0 &&
      !viral.allowed_cta_types.includes(selectedRecipe.ctaType)
    ) {
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
    const snippetPool = eligibleForRecipe.length ? eligibleForRecipe : eligibleSnippets;
    const snippetSelection = await selectSnippet(snippetPool.map((item) => item.id), rules);
    const snippet =
      snippetPool.find((item) => item.id === snippetSelection.value) ?? pickRandom(snippetPool);
    const track = tracks.find((item) => item.id === snippet.trackId);
    if (!track) {
      const msg = "Snippet missing track reference.";
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    const compatibilities = clipSet.map((clip) =>
      computeCompatibility(
        {
          id: clip.id,
          energy: clip.energy,
          motion: clip.motion as "low" | "med" | "high",
          sync: clip.sync as "safe" | "sensitive" | "critical",
          category: clip.category,
          vibe: clip.vibe
        },
        {
          id: snippet.id,
          energyScore: snippet.energyScore,
          energy: snippet.energy,
          section: snippet.section,
          vibe: snippet.vibe
        },
        { disallowHandsKeysLiteral: !rules.guardrails.allow_hands_keys_literal }
      )
    );
    const blocked = compatibilities.some((result) => result.blocked);
    const score = Math.min(...compatibilities.map((result) => result.score));
    const reasons = compatibilities.flatMap((result) => result.reasons);
    if (clipSet.some((clip) => clip.sync === "sensitive")) {
      reasons.push("Contains sensitive sync clip(s)");
    }
    const ctaSelection = await selectCta(viral.allowed_cta_types, rules);
    const cta = ctaSelection?.value ?? null;
    const variantSelection = await selectVariant({
      recipeId: selectedRecipe.id,
      recipeBeat1: selectedRecipe.beat1Templates,
      recipeBeat2: selectedRecipe.beat2Templates,
      ctaId: cta?.id ?? null,
      rules
    });
    if (!variantSelection) {
      const msg = "No valid variant found for recipe.";
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    const variant = variantSelection.value;
    let onscreenText = `${variant.beat1}\n${variant.beat2}`;
    if (rules.guardrails.max_lines > 0) {
      const lines = onscreenText.split("\n").filter(Boolean);
      if (lines.length > rules.guardrails.max_lines) {
        const msg = "On-screen text exceeds guardrail max lines.";
        console.warn(`[planner] ${msg}`);
        warnings.push(msg);
        continue;
      }
    }
    if (viral.require_two_beats && !onscreenText.includes("\n")) {
      const msg = "Two-beat text required but template missing beats.";
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      continue;
    }
    const repair = await ensureTwoBeat({
      onscreenText,
      caption: "",
      hookFamily: selectedRecipe.name,
      container,
      allowedIntents: viral.allowed_cta_types,
      snippet: {
        moment3to7: snippet.moment3to7,
        moment7to11: snippet.moment7to11
      },
      bannedWords: [
        ...rules.guardrails.banned_words,
        ...rules.guardrails.banned_phrases
      bannedWords,
      openAiApiKey,
      model: process.env.OPENAI_MODEL ?? "gpt-4o"
    });
    if (repair.repairApplied) {
      onscreenText = repair.onscreenText;
    }
    const caption = buildCaption(rules);
    if (blocked || score < rules.min_compatibility_score - 0.001) {
      const msg = `Clip set + snippet ${snippet.id} below compatibility (score: ${score.toFixed(2)}, min: ${rules.min_compatibility_score})`;
      console.warn(`[planner] ${msg}`);
      warnings.push(msg);
      if (!blocked) {
        const nextFallback = {
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
          variantId: variant.id,
          ctaId: cta?.id ?? null,
          compatibilityScore: score,
          reasons: cta ? [...reasons, `CTA: ${cta.intent}`] : reasons
        };
        if (!fallbackPlan || nextFallback.compatibilityScore > fallbackPlan.compatibilityScore) {
          fallbackPlan = nextFallback;
        }
      }
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
        variantId: variant.id,
        ctaId: cta?.id ?? null,
        experimentFlags: {
          tested_recipe: rules.optimiser_policy.test_dimensions.recipe,
          tested_variant: rules.optimiser_policy.test_dimensions.variant,
          tested_cta: rules.optimiser_policy.test_dimensions.cta,
          tested_container: rules.optimiser_policy.test_dimensions.container,
          comparisonMode: false,
          optionsCount: 1,
          selection: {
            recipe: recipeSelection.mode,
            variant: variantSelection.mode,
            cta: ctaSelection?.mode ?? "exploit",
            container: containerSelection.mode
          }
        },
        compatibilityScore: score,
        reasons: cta ? [...reasons, `CTA: ${cta.intent}`] : reasons,
        status: "PLANNED"
      }
    });
    await recordArmUse("RECIPE", selectedRecipe.id);
    await recordArmUse("VARIANT", variant.id);
    if (cta) await recordArmUse("CTA", cta.id);
    await recordArmUse("CONTAINER", container);
    await recordArmUse("SNIPPET", snippet.id);
    for (const clip of clipSet) {
      await recordArmUse("CLIP", clip.id);
    }
    createdIds.push(plan.id);
  }
  if (createdIds.length === 0 && fallbackPlan) {
    const plan = await prisma.postPlan.create({
      data: {
        scheduledFor: options?.scheduledFor ?? new Date(),
        container: fallbackPlan.container,
        clipIds: fallbackPlan.clipIds,
        trackId: fallbackPlan.trackId,
        snippetId: fallbackPlan.snippetId,
        snippetStartSec: fallbackPlan.snippetStartSec,
        snippetDurationSec: fallbackPlan.snippetDurationSec,
        onscreenText: fallbackPlan.onscreenText,
        caption: fallbackPlan.caption,
        hookFamily: fallbackPlan.hookFamily,
        recipeId: fallbackPlan.recipeId,
        variantId: fallbackPlan.variantId,
        ctaId: fallbackPlan.ctaId,
        experimentFlags: {
          fallbackApplied: true,
          comparisonMode: false,
          optionsCount: 1
        },
        compatibilityScore: fallbackPlan.compatibilityScore,
        reasons: fallbackPlan.reasons,
        status: "PLANNED"
      }
    });
    createdIds.push(plan.id);
    warnings.push("Fallback plan created below compatibility threshold.");
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
