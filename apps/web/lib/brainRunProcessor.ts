import { prisma } from "./prisma";
import { computeCompatibility } from "../../../packages/core/src/scoring";
import { ensureTwoBeat, validateTwoBeatStructure } from "./brainRepair";
import { validateCtaRelevance } from "./relevanceValidator";
import { logRunEvent } from "./logs";
import { finalizeBrainRun } from "./brainRunLogging";
import { validateBeat1 } from "./planSelection";
import { toneLintPost } from "./toneLint";
import { BrainRunContext } from "./brainRunContext";
import { buildBannedWords, buildCtaMatchers, deriveCtaIntent, enforceCtaIntent } from "./brainRunRules";

type ProcessResult = { created: string[]; skipped: Array<{ reason: string; post: string }> };

type Clip = BrainRunContext["clips"][number];
type Snippet = BrainRunContext["snippets"][number];
type BrainPost = { scheduled_for: string; container: string; clip_ids: string[]; track_id: string; snippet_id: string; onscreen_text: string; caption: string; hook_family: string; confidence: number; reasons: string[]; experiment_flags?: Record<string, unknown> };


export async function processBrainPlan(
  context: BrainRunContext,
  plan: { posts: BrainPost[] },
  prompt: string,
  responseText: string
): Promise<ProcessResult> {
  const { settings, clips, snippets, openAiApiKey } = context;
  const clipsMap = new Map(clips.map((clip) => [clip.id, clip]));
  const snippetsMap = new Map(snippets.map((snippet) => [snippet.id, snippet]));
  const recipeNameMap = new Map((await prisma.hookRecipe.findMany()).map((recipe) => [recipe.name, recipe]));

  const created: string[] = [];
  const skipped: Array<{ reason: string; post: string }> = [];
  let repairCount = 0;
  const bannedWords = buildBannedWords(settings);
  const safeCategories = ["DAW_screen", "Abstract_visual"];

  for (const post of plan.posts) {
    const planClips = post.clip_ids
      .map((id) => clipsMap.get(id))
      .filter((clip): clip is Clip => Boolean(clip));
    const snippet = snippetsMap.get(post.snippet_id) as Snippet | undefined;

    if (planClips.length === 0 || !snippet) {
      skipped.push({ reason: "Missing clips or snippet", post: post.hook_family });
      continue;
    }

    if (post.container === "montage") {
      if (planClips.length < settings.montage.clip_count) {
        skipped.push({ reason: "Not enough clips for montage", post: post.hook_family });
        continue;
      }
      const dawAnchor = planClips.find((clip) => clip.category === "DAW_screen");
      if (dawAnchor) {
        const reordered = [dawAnchor, ...planClips.filter((clip) => clip.id !== dawAnchor.id)];
        post.clip_ids = reordered.map((clip) => clip.id);
      }
    }

    if (post.container === "static_daw") {
      const safeClip = planClips.find((clip) => safeCategories.includes(clip.category));
      if (!safeClip) {
        const fallback = clips.find((clip) => safeCategories.includes(clip.category));
        if (fallback) {
          post.clip_ids = [fallback.id];
        }
      }
    }

    if (planClips.some((clip) => clip.sync === "critical")) {
      skipped.push({ reason: "Critical sync clip blocked", post: post.hook_family });
      continue;
    }

    const recipe = recipeNameMap.get(post.hook_family);
    const disallowedContainers = Array.isArray(recipe?.disallowedContainers)
      ? (recipe?.disallowedContainers as string[])
      : [];
    if (disallowedContainers.includes(post.container)) {
      skipped.push({ reason: "Recipe disallows container", post: post.hook_family });
      continue;
    }

    const derivedIntent = deriveCtaIntent({
      hookFamily: post.hook_family,
      container: post.container,
      allowed: settings.viral_engine.allowed_cta_types,
      snippet
    });

    const repair = await ensureTwoBeat({
      onscreenText: post.onscreen_text,
      caption: post.caption,
      hookFamily: post.hook_family,
      container: post.container,
      allowedIntents: settings.viral_engine.allowed_cta_types,
      preferredIntent: derivedIntent,
      snippet: {
        moment3to7: snippet?.moment3to7,
        moment7to11: snippet?.moment7to11
      },
      bannedWords,
      openAiApiKey,
      model: process.env.OPENAI_MODEL ?? "gpt-4o"
    });
    if (repair.repairApplied) {
      repairCount += 1;
      post.onscreen_text = repair.onscreenText;
    }

    const postFlags = post.experiment_flags ?? {};
    const comparisonMode = Boolean(postFlags.comparisonMode);
    const optionsCount = Number(postFlags.optionsCount ?? 1);

    const beats = post.onscreen_text.split("\n").map((line: string) => line.trim());
    if (settings.viral_engine.require_two_beats && beats.length < 2) {
      skipped.push({ reason: "Missing two-beat text", post: post.hook_family });
      continue;
    }
    if (beats.length > 2) {
      skipped.push({ reason: "Too many text lines", post: post.hook_family });
      continue;
    }
    let beat1 = beats[0] ?? "";
    let beat2 = beats[1] ?? "";

    const beat1Validation = validateBeat1(beat1, settings);
    if (!beat1Validation.valid) {
      await logRunEvent({
        runType: "brain_validation",
        status: "WARN",
        payloadExcerpt: `beat1_invalid: ${beat1Validation.reason}`
      });
    }

    const relevanceRepair = validateCtaRelevance({
      beat1,
      beat2,
      hookFamily: post.hook_family,
      comparisonMode,
      optionsCount
    });
    if (relevanceRepair.repairApplied) {
      repairCount += 1;
      beat2 = relevanceRepair.beat2;
      post.onscreen_text = relevanceRepair.onscreenText;
      await logRunEvent({
        runType: "brain_repair",
        status: "WARN",
        payloadExcerpt: "reason=multiOptionCtaInvalid"
      });
    }

    if (!enforceCtaIntent(beat2, derivedIntent)) {
      const fallback = await ensureTwoBeat({
        onscreenText: beat1,
        caption: post.caption,
        hookFamily: post.hook_family,
        container: post.container,
        allowedIntents: settings.viral_engine.allowed_cta_types,
        preferredIntent: derivedIntent,
        snippet: {
          moment3to7: snippet?.moment3to7,
          moment7to11: snippet?.moment7to11
        },
        bannedWords,
        openAiApiKey,
        model: process.env.OPENAI_MODEL ?? "gpt-4o"
      });
      post.onscreen_text = fallback.onscreenText;
      beat2 = fallback.onscreenText.split("\n")[1] ?? beat2;
    }

    const toneLint = await toneLintPost({
      onscreenText: post.onscreen_text,
      caption: post.caption,
      hookFamily: post.hook_family,
      ctaIntent: derivedIntent,
      voiceProfile: settings.voice_profile,
      bannedWords: settings.voice_banned_words,
      voiceAnchors: context.voiceBankLines,
      openAiApiKey,
      model: process.env.OPENAI_MODEL ?? "gpt-4o"
    });
    if (toneLint.rewritten) {
      post.onscreen_text = toneLint.onscreenText;
      post.caption = toneLint.caption;
      const lintBeats = post.onscreen_text.split("\n").map((line: string) => line.trim());
      beat1 = lintBeats[0] ?? beat1;
      beat2 = lintBeats[1] ?? beat2;
    }

    const twoBeatValidation = validateTwoBeatStructure(post.onscreen_text);
    if (!twoBeatValidation.valid) {
      await logRunEvent({
        runType: "brain_validation",
        status: "WARN",
        payloadExcerpt: `twobeat_invalid: ${twoBeatValidation.reason}`
      });
    }

    if (bannedWords.some((word) =>
      `${post.onscreen_text} ${post.caption}`.toLowerCase().includes(word)
    )) {
      skipped.push({ reason: "Filler word detected", post: post.hook_family });
      continue;
    }

    const allowedCtas = settings.viral_engine.allowed_cta_types;
    const ctaHit = allowedCtas.some((cta) =>
      (buildCtaMatchers()[cta] ?? []).some((token: string) =>
        `${post.onscreen_text} ${post.caption}`.toLowerCase().includes(token)
      )
    );
    if (!ctaHit) {
      skipped.push({ reason: "CTA missing or disallowed", post: post.hook_family });
      continue;
    }

    const adjustedClips = post.clip_ids
      .map((id) => clipsMap.get(id))
      .filter((clip): clip is Clip => Boolean(clip));
    if (adjustedClips.length === 0) {
      skipped.push({ reason: "No valid clips after adjustment", post: post.hook_family });
      continue;
    }

    const compatibilities = adjustedClips.map((clip) =>
      computeCompatibility(
        {
          id: clip.id,
          energy: clip.energy,
          motion: clip.motion as "low" | "med" | "high",
          sync: clip.sync as "safe" | "sensitive" | "critical",
          category: clip.category
        },
        {
          id: snippet.id,
          energyScore: snippet.energyScore
        },
        { disallowHandsKeysLiteral: true }
      )
    );
    const score = Math.min(...compatibilities.map((item: { score: number }) => item.score));
    const reasons = [
      ...compatibilities.flatMap((item: { reasons: string[] }) => item.reasons),
      ...post.reasons
    ];

    let caption = post.caption;
    if (settings.caption_topic_keywords.length > 0) {
      const keyword =
        settings.caption_topic_keywords[
          Math.floor(Math.random() * settings.caption_topic_keywords.length)
        ];
      if (!caption.toLowerCase().startsWith(keyword.toLowerCase())) {
        caption = `${keyword} ${caption}`.trim();
      }
    }

    // Compute a valid scheduled date - don't rely on AI
    let scheduledFor = new Date(post.scheduled_for);
    if (isNaN(scheduledFor.getTime())) {
      // Invalid date from AI - compute based on current time + index offset
      const baseDate = new Date();
      const postIndex = created.length;
      baseDate.setHours(baseDate.getHours() + 4 + postIndex * 4); // Space posts 4 hours apart
      scheduledFor = baseDate;
    }

    const createdPlan = await prisma.postPlan.create({
      data: {
        scheduledFor,
        container: post.container,
        clipIds: post.clip_ids,
        trackId: post.track_id,
        snippetId: post.snippet_id,
        snippetStartSec: snippet.startSec,
        snippetDurationSec: snippet.durationSec,
        onscreenText: post.onscreen_text,
        caption,
        hookFamily: post.hook_family,
        experimentFlags: {
          repairApplied: repair.repairApplied || relevanceRepair.repairApplied,
          repairType: repair.repairType ?? null,
          repairReason: relevanceRepair.reason ?? null,
          ctaIntent: derivedIntent,
          comparisonMode,
          optionsCount
        },
        compatibilityScore: score,
        reasons,
        status: "PLANNED"
      }
    });
    created.push(createdPlan.id);
  }
  await finalizeBrainRun(repairCount, prompt, responseText);

  return { created, skipped };
}
