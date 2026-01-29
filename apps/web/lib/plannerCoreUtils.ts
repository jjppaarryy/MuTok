import { prisma } from "./prisma";
import { computeCompatibility } from "../../../packages/core/src/scoring";
import { pickRandom } from "./plannerUtils";
import { selectClip } from "./planSelection";
import type { RulesSettings } from "./rulesConfig";
import type { CooldownState } from "./plannerCooldowns";

type Clip = Awaited<ReturnType<typeof prisma.clip.findMany>>[number];
type Snippet = Awaited<ReturnType<typeof prisma.snippet.findMany>>[number];

export const countHashtags = (caption: string) =>
  (caption.match(/#[^\s#]+/g) ?? []).length;

export const evaluateCompatibility = (
  clipSet: Clip[],
  snippet: Snippet,
  rules: RulesSettings
) => {
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
  return { blocked, score, reasons };
};

export const buildClipSet = async (params: {
  container: string;
  containers: string[];
  rules: RulesSettings;
  eligibleMontageClips: Clip[];
  eligibleSafeClips: Clip[];
  clips: Clip[];
}) => {
  const { rules, eligibleMontageClips, eligibleSafeClips, clips } = params;
  let { container } = params;
  let containerRelaxed = false;
  let clipSet: Clip[] = [];
  let warning: string | null = null;

  if (container === "montage" && eligibleMontageClips.length < rules.montage.clip_count) {
    if (params.containers.includes("static_daw")) {
      container = "static_daw";
      containerRelaxed = true;
    } else {
      warning = "Not enough eligible clips for montage.";
    }
  }

  if (!warning && container === "montage") {
    const dawAnchors = eligibleMontageClips.filter((clip) => clip.category === "DAW_screen");
    let firstClip = null as Clip | null;
    if (dawAnchors.length > 0) {
      const selection = await selectClip(dawAnchors.map((clip) => clip.id), rules);
      firstClip = dawAnchors.find((clip) => clip.id === selection.value) ?? pickRandom(dawAnchors);
    }
    const remainingPool = eligibleMontageClips.filter((clip) => clip.id !== firstClip?.id);
    const neededClips = Math.max(0, rules.montage.clip_count - (firstClip ? 1 : 0));
    const rest: Clip[] = [];
    let pool = [...remainingPool];
    while (pool.length > 0 && rest.length < neededClips) {
      const selection = await selectClip(pool.map((clip) => clip.id), rules);
      const picked = pool.find((clip) => clip.id === selection.value) ?? pickRandom(pool);
      rest.push(picked);
      pool = pool.filter((clip) => clip.id !== picked.id);
    }
    clipSet = firstClip ? [firstClip, ...rest] : rest;
  }

  if (!warning && container !== "montage") {
    const basePool = eligibleSafeClips.length ? eligibleSafeClips : clips;
    const selection = await selectClip(basePool.map((clip) => clip.id), rules);
    const picked = basePool.find((clip) => clip.id === selection.value) ?? pickRandom(basePool);
    clipSet = picked ? [picked] : [];
  }

  if (!warning && clipSet.length === 0) {
    warning = "No eligible clips for container.";
  }

  return { container, clipSet, containerRelaxed, warning };
};

export const buildOnscreenAndCaption = (params: {
  beat1: string;
  beat2: string;
  captionTemplate: string | null | undefined;
  rules: RulesSettings;
}) => {
  const { beat1, beat2, captionTemplate, rules } = params;
  if (!beat1 || !beat2) {
    return { warning: "Recipe missing fixed beat text." };
  }
  const onscreenText = `${beat1}\n${beat2}`;
  if (rules.guardrails.max_lines > 0) {
    const lines = onscreenText.split("\n").filter(Boolean);
    if (lines.length > rules.guardrails.max_lines) {
      return { warning: "On-screen text exceeds guardrail max lines." };
    }
  }
  if (rules.viral_engine.require_two_beats && !onscreenText.includes("\n")) {
    return { warning: "Two-beat text required but template missing beats." };
  }
  const caption = captionTemplate?.trim() ?? "";
  if (!caption) {
    return { warning: "Recipe missing caption text." };
  }
  const hashtagTotal = countHashtags(caption);
  if (
    hashtagTotal < rules.spam_guardrails.hashtag_count_min ||
    hashtagTotal > rules.spam_guardrails.hashtag_count_max
  ) {
    return { warning: `Caption hashtag count out of range (${hashtagTotal}).` };
  }
  return { onscreenText, caption };
};

export const isMontageTemplateBlocked = (
  container: string,
  clipSet: Clip[],
  cooldownState: CooldownState
) => {
  if (container !== "montage") return false;
  const signature = clipSet.map((clip) => clip.id).join("|");
  return cooldownState.recentMontageTemplates.has(signature);
};
