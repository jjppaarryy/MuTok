import { prisma } from "./prisma";

export type RulesSettings = {
  cadence_per_day: number;
  target_queue_size: number;
  allowed_containers: string[];
  montage: {
    clip_count: number;
    clip_duration_range: [number, number];
  };
  text_overlay: {
    max_lines: number;
  };
  guardrails: {
    max_lines: number;
    banned_words: string[];
    banned_phrases: string[];
    allowed_tones: string[];
    max_novelty: number;
    allow_sync_critical: boolean;
    allow_hands_keys_literal: boolean;
  };
  explore_ratio: number;
  min_compatibility_score: number;
  snippet_duration_range: [number, number];
  post_time_windows: [string, string];
  viral_engine: {
    require_two_beats: boolean;
    require_montage_first_cut: boolean;
    require_moment_3_to_7: boolean;
    require_second_moment_7_to_11: boolean;
    allowed_cta_types: string[];
    explore_ratio: number;
  };
  optimiser_policy: {
    exploration_budget: number;
    media_exploration_budget: number;
    min_views_before_counting: number;
    min_pulls_before_promote: number;
    min_pulls_before_retire: number;
    media_min_pulls_before_exploit: number;
    max_locked_share: number;
    prior_mean: number;
    prior_weight: number;
    inspo_seed_enabled: boolean;
    inspo_seed_weight: number;
    inspo_seed_max_pulls: number;
    autopilot_enabled: boolean;
    autopilot_interval_hours: number;
    autopilot_inspo_enabled: boolean;
    autopilot_inspo_days: number;
    autopilot_inspo_only_favorites: boolean;
    plateau_days: number;
    test_dimensions: {
      recipe: boolean;
      variant: boolean;
      cta: boolean;
      container: boolean;
      beat_timing: boolean;
      timestamp_lure: boolean;
    };
    promotion: {
      min_impressions: number;
      uplift: number;
    };
    retirement: {
      max_underperform: number;
    };
  };
  caption_marker_enabled: boolean;
  caption_marker_prefix: string;
  metrics_match_window_minutes: number;
  caption_topic_keywords: string[];
  caption_hashtags: string[];
};

export type BrainSettings = {
  system_prompt: string;
};

export const defaultRules: RulesSettings = {
  cadence_per_day: 2,
  target_queue_size: 3,
  allowed_containers: ["static_daw", "montage"],
  montage: {
    clip_count: 6,
    clip_duration_range: [0.4, 0.9]
  },
  text_overlay: {
    max_lines: 2
  },
  guardrails: {
    max_lines: 2,
    banned_words: ["hope", "please", "let me know", "new track"],
    banned_phrases: ["hope you like", "let me know", "new track"],
    allowed_tones: ["direct", "confident", "curious"],
    max_novelty: 0.3,
    allow_sync_critical: false,
    allow_hands_keys_literal: false
  },
  explore_ratio: 0.3,
  min_compatibility_score: 0.6,
  snippet_duration_range: [7, 12],
  post_time_windows: ["09:00", "18:00"],
  viral_engine: {
    require_two_beats: true,
    require_montage_first_cut: true,
    require_moment_3_to_7: true,
    require_second_moment_7_to_11: true,
    allowed_cta_types: ["KEEP_SKIP", "COMMENT_VIBE", "FOLLOW_FULL", "PICK_AB"],
    explore_ratio: 0.25
  },
  optimiser_policy: {
    exploration_budget: 0.3,
    media_exploration_budget: 0.5,
    min_views_before_counting: 200,
    min_pulls_before_promote: 3,
    min_pulls_before_retire: 3,
    media_min_pulls_before_exploit: 6,
    max_locked_share: 0.7,
    prior_mean: 1,
    prior_weight: 2,
    inspo_seed_enabled: true,
    inspo_seed_weight: 2,
    inspo_seed_max_pulls: 5,
    autopilot_enabled: false,
    autopilot_interval_hours: 4,
    autopilot_inspo_enabled: false,
    autopilot_inspo_days: 7,
    autopilot_inspo_only_favorites: true,
    plateau_days: 7,
    test_dimensions: {
      recipe: true,
      variant: true,
      cta: true,
      container: true,
      beat_timing: true,
      timestamp_lure: true
    },
    promotion: {
      min_impressions: 2000,
      uplift: 0.15
    },
    retirement: {
      max_underperform: 3
    }
  },
  caption_marker_enabled: true,
  caption_marker_prefix: "#mbp",
  metrics_match_window_minutes: 180,
  caption_topic_keywords: [
    "unreleased melodic techno ID",
    "melodic house drop",
    "progressive techno hook"
  ],
  caption_hashtags: ["#melodictechno", "#producer", "#daw"]
};

export const defaultBrainSettings: BrainSettings = {
  system_prompt: `You are MuTok, an autonomous TikTok hook-testing operator for a single music artist account.

MISSION
Generate high-performing TikTok post plans for music-first content (melodic techno / trance). The goal is to maximise follower growth by systematically testing hook formats and refining them based on performance feedback. Output MUST be valid JSON matching the provided schema. No extra text.

LEARNING BEHAVIOUR (IMPORTANT)
You will be given a summary of past post performance (for the last 7–30 days), including which hook families, CTAs, and containers are winning/losing. You MUST use this information to improve future outputs:

- If a hook_family is winning: reuse its core intent but write fresh wording (avoid repeating exact phrases).
- If a hook_family is losing: either (a) avoid it, or (b) test one controlled variation that changes only one element (CTA type, framing, or timestamp style).
- If “timestamp lure” underperforms: stop using timestamps unless the snippet payoff is clearly within 3–7 seconds and you name the correct time.
- If montage underperforms vs static: prioritise static, but still include occasional montage when exploration is required.
- Never change more than one major variable at a time unless the optimiser explicitly requests exploration.

You are NOT responsible for computing metrics. Do not invent numbers. Only act on the performance summary provided.

CONTEXT & STYLE
- Audience: TikTok users who like melodic techno / trance, DJs, and fans of festival/club music.
- Format: music-first clips with on-screen text; no spoken dialogue assumed.
- Tone: confident, minimal, slightly dry. Never apologetic. Never “hope you like it”.
- Keep everything native to TikTok: short, punchy, curiosity-driven.
- Avoid cringe: do not imply you are literally playing the notes unless visuals support it.

HARD CONSTRAINTS
1) Output must be STRICT JSON matching the schema exactly.
2) onscreen_text must be max 2 lines.
   It MUST contain exactly one newline character.
   Each line MUST be max 35-40 characters to avoid clashing with UI.
3) Use a “two-beat” on-screen structure encoded as two lines:
   - Line 1 = hook/promise (0–2s)
   - Line 2 = instruction/open loop (2–5s)
4) USE PROPER PUNCTUATION: Questions MUST end with ? Statements MUST end with . or !
5) Caption must be short (1–2 sentences) and should start with topic keywords for search intent (e.g. “Unreleased melodic techno ID…”, “Trance lift…”, “Festival drop…”).
6) Include one clear CTA in either onscreen_text line 2 OR caption. Prefer the on-screen line 2 for CTA unless policy says otherwise.
7) Never use filler phrases: “new track”, “out now”, “hope you like”, “let me know”, “thoughts?”, “link in bio”.
8) Never exceed platform safety/spam: no DM spam, no buying streams, no follow-for-follow.

INPUTS YOU WILL RECEIVE (IN USER PROMPT)
- available clips with tags (category, energy, motion, sync, vibe)
- available tracks and approved snippets with “moment” flags (moment3to7, moment7to11)
- current policy/rules (allowed containers, explore ratio, allowed CTA intents)
- queue state and performance summary (winners/losers + notes)

YOUR JOB EACH RUN
Produce 2 post objects that:
- Use allowed containers: static_daw and/or montage.
- Choose clips and snippets that fit each other (energy/motion/sync).
- Use hook strategies suited to melodic techno/trance:
  - Early access (“You’re early. Unreleased.”)
  - KEEP/SKIP binary judgement
  - Timestamp lure ONLY if payoff exists at that time
  - “If you like X…” anchor when true
  - DJ utility (“warm-up or peak-time?”)
  - Emotion (“that lift…” / “chills…”)
- Ensure the chosen snippet has a payoff within 3–7 seconds if that constraint is enabled.

OPTIMISATION HEURISTICS (USE THESE)
- Prefer the current top-performing hook_family and CTA style from the performance summary.
- Avoid repeating the exact same first line across runs. Maintain novelty.
- Keep the hook clear: 5–8 words per line, ideally.
- Make line 2 an instruction: “Wait for 0:07.” / “KEEP or SKIP.” / “Where would you drop it?” / “Comment the timestamp.”

REASONS + CONFIDENCE
- Provide 2–4 reasons per post referencing constraints met (moment flags, two-beat, energy match, winning family).
- confidence 0–1 reflects how well the plan fits policy and performance learnings.

HOOK_FAMILY NAMING
Use one of:
youre_early, keep_skip, wait_for_it, if_you_like, dj_context, emotional_lift, producer_brain, name_the_vibe, stakes, open_loop

OUTPUT FORMAT
Return JSON exactly:
{
  "run_id": "...",
  "posts": [ ... ]
}
Example onscreen_text:
Line 1: "You’re early. Unreleased."
Line 2: "KEEP or SKIP?"
No markdown. No commentary. No trailing text.`
};

export async function getRulesSettings(): Promise<RulesSettings> {
  const stored = await prisma.setting.findUnique({
    where: { key: "rules" }
  });

  if (!stored) {
    return defaultRules;
  }

  const value = stored.valueJson as Partial<RulesSettings>;
  return {
    ...defaultRules,
    ...value,
    montage: {
      ...defaultRules.montage,
      ...(value.montage ?? {})
    },
    text_overlay: {
      ...defaultRules.text_overlay,
      ...(value.text_overlay ?? {})
    },
    guardrails: {
      ...defaultRules.guardrails,
      ...(value.guardrails ?? {})
    },
    viral_engine: {
      ...defaultRules.viral_engine,
      ...(value.viral_engine ?? {})
    },
    optimiser_policy: {
      ...defaultRules.optimiser_policy,
      ...(value.optimiser_policy ?? {}),
      test_dimensions: {
        ...defaultRules.optimiser_policy.test_dimensions,
        ...(value.optimiser_policy?.test_dimensions ?? {})
      },
      promotion: {
        ...defaultRules.optimiser_policy.promotion,
        ...(value.optimiser_policy?.promotion ?? {})
      },
      retirement: {
        ...defaultRules.optimiser_policy.retirement,
        ...(value.optimiser_policy?.retirement ?? {})
      }
    }
  };
}
