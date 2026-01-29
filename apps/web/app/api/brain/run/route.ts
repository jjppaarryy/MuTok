import { NextResponse } from "next/server";
import { runBrain } from "../../../../lib/brain";
import { prisma } from "../../../../lib/prisma";
import { getAnalyticsSummary } from "../../../../lib/analytics";
import { getRulesSettings, defaultBrainSettings } from "../../../../lib/settings";
import { computeCompatibility } from "../../../../../../packages/core/src/scoring";
import { ensureHookRecipes } from "../../../../lib/hookRecipes";
import { ensureTwoBeat } from "../../../../lib/brainRepair";
import { validateCtaRelevance } from "../../../../lib/relevanceValidator";
import { logRunEvent } from "../../../../lib/logs";
import { getConfig } from "../../../../lib/config";

export async function POST() {
  const openAiApiKey = await getConfig("OPENAI_API_KEY");
  const settings = await getRulesSettings();
  const [
    clips,
    snippets,
    queueState,
    metricsSummary,
    brainSetting,
    armStats,
    hookRecipes,
    ctas,
    metrics
  ] = await Promise.all([
    prisma.clip.findMany(),
    prisma.snippet.findMany({ where: { approved: true } }),
    prisma.postPlan.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    getAnalyticsSummary(),
    prisma.setting.findUnique({ where: { key: "brain" } }),
    prisma.armStats.findMany(),
    prisma.hookRecipe.findMany(),
    prisma.cta.findMany(),
    prisma.metric.findMany({
      where: { rewardScore: { not: null } },
      orderBy: { rewardScore: "desc" },
      take: 5
    })
  ]);

  const recipeMap = new Map(hookRecipes.map((recipe) => [recipe.id, recipe]));
  const ctaMap = new Map(ctas.map((cta) => [cta.id, cta]));
  const priorMean = settings.optimiser_policy.prior_mean;
  const priorWeight = settings.optimiser_policy.prior_weight;

  const avgReward = (rewardSum: number, pulls: number) =>
    (rewardSum + priorMean * priorWeight) / Math.max(1, pulls + priorWeight);

  const top_hook_families = armStats
    .filter((row) => row.armType === "RECIPE")
    .map((row) => ({
      name: recipeMap.get(row.armId)?.name ?? row.armId,
      avg_reward: avgReward(row.rewardSum, row.pulls),
      sample_size: row.pulls
    }))
    .sort((a, b) => b.avg_reward - a.avg_reward)
    .slice(0, 5);

  const ctaIntentStats = new Map<
    string,
    { rewardSum: number; pulls: number }
  >();
  for (const row of armStats.filter((item) => item.armType === "CTA")) {
    const intent = ctaMap.get(row.armId)?.intent ?? "UNKNOWN";
    const current = ctaIntentStats.get(intent) ?? { rewardSum: 0, pulls: 0 };
    ctaIntentStats.set(intent, {
      rewardSum: current.rewardSum + row.rewardSum,
      pulls: current.pulls + row.pulls
    });
  }
  const top_cta_intents = [...ctaIntentStats.entries()]
    .map(([intent, value]) => ({
      intent,
      avg_reward: avgReward(value.rewardSum, value.pulls),
      sample_size: value.pulls
    }))
    .sort((a, b) => b.avg_reward - a.avg_reward)
    .slice(0, 5);

  const container_perf = armStats
    .filter((row) => row.armType === "CONTAINER")
    .map((row) => ({
      container: row.armId,
      avg_reward: avgReward(row.rewardSum, row.pulls),
      sample_size: row.pulls
    }))
    .sort((a, b) => b.avg_reward - a.avg_reward);

  const planIds = metrics.map((row) => row.postPlanId);
  const plans = await prisma.postPlan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, onscreenText: true }
  });
  const planMap = new Map(plans.map((plan) => [plan.id, plan]));
  const best_examples = metrics.map((row) => ({
    post_id: row.postPlanId,
    onscreen_text: planMap.get(row.postPlanId)?.onscreenText ?? "",
    reward: row.rewardScore ?? 0
  }));

  const payload = {
    settings,
    clips,
    snippets,
    metricsSummary,
    queueState: { recent: queueState },
    performance_summary: {
      top_hook_families,
      top_cta_intents,
      container_perf,
      phrases_to_avoid: [
        ...settings.guardrails.banned_phrases,
        ...settings.guardrails.banned_words
      ],
      best_examples,
      enabled_hook_families: hookRecipes
        .filter((recipe) => recipe.enabled)
        .map((recipe) => recipe.name)
    }
  };

  const systemPrompt =
    (brainSetting?.valueJson as { system_prompt?: string })?.system_prompt ??
    defaultBrainSettings.system_prompt;
  const result = await runBrain(payload, systemPrompt);

  await ensureHookRecipes();
  const recipes = await prisma.hookRecipe.findMany();
  const recipeNameMap = new Map(recipes.map((recipe) => [recipe.name, recipe]));
  const clipsMap = new Map(clips.map((clip) => [clip.id, clip]));
  const snippetsMap = new Map(snippets.map((snippet) => [snippet.id, snippet]));

  const created = [];
  const skipped: Array<{ reason: string; post: string }> = [];
  let repairCount = 0;
  const bannedWords = [
    ...settings.guardrails.banned_words,
    ...settings.guardrails.banned_phrases
  ];
  const safeCategories = ["DAW_screen", "Abstract_visual"];
  const ctaMatchers: Record<string, string[]> = {
    KEEP_SKIP: ["keep", "skip"],
    COMMENT_VIBE: ["comment", "vibe", "name"],
    FOLLOW_FULL: ["follow"],
    PICK_AB: ["pick", "a/b", "choose"]
  };
  const deriveCtaIntent = (params: {
    hookFamily: string;
    container: string;
    allowed: string[];
    snippet?: { moment3to7?: boolean; moment7to11?: boolean };
  }) => {
    const allowed = params.allowed.length ? params.allowed : Object.keys(ctaMatchers);
    const prefer = (intents: string[]) => intents.find((intent) => allowed.includes(intent));
    if (params.container === "montage") {
      return prefer(["KEEP_SKIP", "PICK_AB", "COMMENT_VIBE", "FOLLOW_FULL"]) ?? allowed[0];
    }
    if (params.hookFamily === "wait_for_it") {
      const hasMoment = params.snippet?.moment3to7 || params.snippet?.moment7to11;
      return hasMoment
        ? prefer(["COMMENT_VIBE", "KEEP_SKIP", "PICK_AB"]) ?? allowed[0]
        : prefer(["KEEP_SKIP", "PICK_AB"]) ?? allowed[0];
    }
    if (params.hookFamily === "youre_early") {
      return prefer(["KEEP_SKIP", "FOLLOW_FULL", "COMMENT_VIBE"]) ?? allowed[0];
    }
    if (params.hookFamily === "dj_context") {
      return prefer(["COMMENT_VIBE", "KEEP_SKIP"]) ?? allowed[0];
    }
    if (params.hookFamily === "emotional_lift") {
      return prefer(["COMMENT_VIBE", "KEEP_SKIP"]) ?? allowed[0];
    }
    return prefer(["KEEP_SKIP", "COMMENT_VIBE", "FOLLOW_FULL", "PICK_AB"]) ?? allowed[0];
  };
  const enforceCtaIntent = (line2: string, intent: string) => {
    const tokens = ctaMatchers[intent] ?? [];
    const lower = line2.toLowerCase();
    return tokens.some((token) => lower.includes(token));
  };
  for (const post of result.plan.posts) {
    const planClips = post.clip_ids
      .map((id) => clipsMap.get(id))
      .filter((clip): clip is NonNullable<typeof clip> => Boolean(clip));
    const snippet = snippetsMap.get(post.snippet_id);

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
      const safeClip = planClips.find((clip) =>
        safeCategories.includes(clip.category)
      );
      if (!safeClip) {
        const fallback = clips.find((clip) =>
          safeCategories.includes(clip.category)
        );
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
    const postFlags = (post as { experiment_flags?: Record<string, unknown> }).experiment_flags ?? {};
    const comparisonMode = Boolean(postFlags.comparisonMode);
    const optionsCount = Number(postFlags.optionsCount ?? 1);

    const beats = post.onscreen_text.split("\n").map((line) => line.trim());
    if (settings.viral_engine.require_two_beats && beats.length < 2) {
      skipped.push({ reason: "Missing two-beat text", post: post.hook_family });
      continue;
    }
    if (beats.length > 2) {
      skipped.push({ reason: "Too many text lines", post: post.hook_family });
      continue;
    }
    const beat1 = beats[0] ?? "";
    let beat2 = beats[1] ?? "";
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
        openAiApiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL ?? "gpt-4o"
      });
      post.onscreen_text = fallback.onscreenText;
      beat2 = fallback.onscreenText.split("\n")[1] ?? beat2;
    }
    if (bannedWords.some((word) =>
      `${post.onscreen_text} ${post.caption}`.toLowerCase().includes(word)
    )) {
      skipped.push({ reason: "Filler word detected", post: post.hook_family });
      continue;
    }

    const allowedCtas = settings.viral_engine.allowed_cta_types;
    const ctaHit = allowedCtas.some((cta) =>
      (ctaMatchers[cta] ?? []).some((token) =>
        `${post.onscreen_text} ${post.caption}`.toLowerCase().includes(token)
      )
    );
    if (!ctaHit) {
      skipped.push({ reason: "CTA missing or disallowed", post: post.hook_family });
      continue;
    }

    const adjustedClips = post.clip_ids
      .map((id) => clipsMap.get(id))
      .filter((clip): clip is NonNullable<typeof clip> => Boolean(clip));

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
    const score = Math.min(...compatibilities.map((item) => item.score));
    const reasons = [
      ...compatibilities.flatMap((item) => item.reasons),
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
    if (settings.caption_hashtags.length > 0) {
      const tags = settings.caption_hashtags.slice(0, 3).join(" ");
      caption = `${caption} ${tags}`.trim();
    }
    if (settings.caption_marker_enabled) {
      const suffix = Math.random().toString(36).slice(2, 8);
      caption = `${caption} ${settings.caption_marker_prefix}${suffix}`.trim();
    }

    const createdPlan = await prisma.postPlan.create({
      data: {
        scheduledFor: new Date(post.scheduled_for),
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
  if (repairCount > 0) {
    await logRunEvent({
      runType: "brain_repair",
      status: "WARN",
      payloadExcerpt: `count=${repairCount}`
    });
  }

  await prisma.runLog.create({
    data: {
      runType: "brain_run",
      startedAt: new Date(),
      finishedAt: new Date(),
      status: "SUCCESS",
      payloadExcerpt: result.prompt.slice(0, 1000),
      error: result.responseText.slice(0, 1000)
    }
  });

  return NextResponse.json({ plan: result.plan, created, skipped });
}
