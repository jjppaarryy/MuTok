import { prisma } from "./prisma";
import { computeCompatibility } from "../../../packages/core/src/scoring";
import { pickMany, pickRandom, shuffle } from "./plannerUtils";
import { normalizeClipCategory } from "./clipCategories";
import type { RulesSettings } from "./rulesConfig";
import type { CooldownState } from "./plannerCooldowns";

function getMontageClipCountRange(rules: RulesSettings): [number, number] {
  const min = rules.montage.clip_count_min ?? rules.montage.clip_count;
  const max = rules.montage.clip_count_max ?? rules.montage.clip_count;
  return [Math.max(1, min), Math.max(1, max)];
}

type Clip = Awaited<ReturnType<typeof prisma.clip.findMany>>[number] & {
  clipSetItems?: { clipSetId: string }[];
};
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
        sync: clip.sync as "safe" | "sensitive" | "critical",
        category: normalizeClipCategory(clip.category)
      },
      {
        id: snippet.id,
        section: snippet.section
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
  minDurationSec?: number;
}) => {
  const { rules, eligibleMontageClips, eligibleSafeClips, clips } = params;
  let { container } = params;
  let containerRelaxed = false;
  let clipSet: Clip[] = [];
  let warning: string | null = null;
  const [montageMin, montageMax] = getMontageClipCountRange(rules);
  const montageLow = Math.min(montageMin, montageMax);
  const montageHigh = Math.max(montageMin, montageMax);
  const montageCount =
    montageLow + Math.floor(Math.random() * (montageHigh - montageLow + 1));

  const buildClipGroups = (pool: Clip[]) => {
    const groups = new Map<string, Clip[]>();
    const ungrouped: Clip[] = [];
    pool.forEach((clip) => {
      const setIds = clip.clipSetItems?.map((item) => item.clipSetId) ?? [];
      if (setIds.length === 0) {
        ungrouped.push(clip);
        return;
      }
      setIds.forEach((setId) => {
        const group = groups.get(setId) ?? [];
        group.push(clip);
        groups.set(setId, group);
      });
    });
    return { groups, ungrouped };
  };

  if (container === "montage" && eligibleMontageClips.length < montageCount) {
    if (params.containers.includes("static_daw")) {
      container = "static_daw";
      containerRelaxed = true;
    } else {
      warning = "Not enough eligible clips for montage.";
    }
  }

  if (!warning && container === "montage") {
    const { groups, ungrouped } = buildClipGroups(eligibleMontageClips);
    const groupCandidates = [...groups.entries()].filter(([, group]) => group.length >= montageCount);
    const rawPool =
      groupCandidates.length > 0
        ? pickRandom(groupCandidates)[1]
        : eligibleMontageClips.length >= montageCount
          ? eligibleMontageClips
          : ungrouped;
    const groupPool = shuffle([...rawPool]);

    if (groupPool.length === 0) {
      warning = "No eligible clips for montage.";
    } else {
      clipSet = pickMany(groupPool, Math.min(montageCount, groupPool.length));
    }
  }

  if (!warning && container !== "montage") {
    const safePool = eligibleSafeClips.length ? eligibleSafeClips : clips;
    const broadPool = eligibleMontageClips.length ? eligibleMontageClips : clips;
    const basePool = broadPool.length > safePool.length ? broadPool : safePool;
    const minDur = params.minDurationSec;
    const durationPool = minDur != null
      ? basePool.filter((clip) => clip.durationSec >= minDur)
      : basePool;
    const selectionPool = durationPool.length > 0 ? durationPool : basePool;
    const shuffledPool = shuffle([...selectionPool]);
    if (shuffledPool.length === 0) {
      warning = "No eligible clips for container.";
    } else {
      const picked = pickRandom(shuffledPool);
      clipSet = [picked];
    }
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
    return { onscreenText, caption, warning: `Caption hashtag count out of range (${hashtagTotal}).` };
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
