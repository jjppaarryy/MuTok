export type RulesSettings = {
  cadence_per_day: number;
  target_queue_size: number;
  allowed_containers: string[];
  montage: {
    clip_count: number;
    clip_count_min: number;
    clip_count_max: number;
    clip_duration_range: [number, number];
  };
  text_overlay: {
    max_lines: number;
    font_size: number;
    margin_x: number;
    margin_top: number;
    box_opacity: number;
    box_padding: number;
    beat1_duration: number;
    beat2_duration: number;
  };
  guardrails: {
    max_lines: number;
    banned_words: string[];
    banned_phrases: string[];
    allowed_tones: string[];
    max_novelty: number;
    allow_sync_critical: boolean;
    allow_hands_keys_literal: boolean;
    beat1_max_chars: number;
    beat1_triggers: string[];
    beat1_no_questions: boolean;
  };
  spam_guardrails: {
    pending_drafts_cap: number;
    daily_draft_upload_cap: number;
    min_gap_hours: number;
    window_jitter_minutes: number;
    recipe_cooldown_days: number;
    beat1_exact_cooldown_days: number;
    beat2_exact_cooldown_days: number;
    caption_exact_cooldown_days: number;
    beat1_prefix_words: number;
    beat1_prefix_cooldown_days: number;
    snippet_cooldown_hours: number;
    track_cooldown_hours: number;
    clip_cooldown_hours: number;
    montage_template_cooldown_hours: number;
    max_hook_family_per_day: number;
    max_hook_family_per_week: number;
    max_anti_algo_per_week: number;
    max_comment_cta_per_day: number;
    max_same_cta_intent_in_row: number;
    max_snippet_style_per_day: number;
    hashtag_count_min: number;
    hashtag_count_max: number;
    retire_score_threshold: number;
    retire_min_posts: number;
  };
  recovery_mode: {
    enabled: boolean;
    days: number;
    views_drop_threshold: number;
    view2s_drop_threshold: number;
    spam_error_threshold: number;
    cadence_per_day: number;
    allow_montage: boolean;
    allow_comment_cta: boolean;
    hashtag_max: number;
  };
  explore_ratio: number;
  min_compatibility_score: number;
  snippet_duration_range: [number, number];
  post_time_windows: string[];
  viral_engine: {
    require_two_beats: boolean;
    require_montage_first_cut: boolean;
    require_moment_3_to_7: boolean;
    require_second_moment_7_to_11: boolean;
    allowed_cta_types: string[];
    explore_ratio: number;
    recipe_daily_max: number;
    preflight_min_score: number;
    preflight_review_score: number;
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
    autopilot_enabled: boolean;
    autopilot_interval_hours: number;
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
  voice_profile: string;
  voice_banned_words: string[];
  voice_examples_limit: number;
};

export const defaultRules: RulesSettings = {
  cadence_per_day: 3,
  target_queue_size: 3,
  allowed_containers: ["static_daw", "montage"],
  montage: {
    clip_count: 6,
    clip_count_min: 3,
    clip_count_max: 20,
    clip_duration_range: [0.4, 0.9]
  },
  text_overlay: {
    max_lines: 2,
    font_size: 58,
    margin_x: 100,
    margin_top: 120,
    box_opacity: 0.6,
    box_padding: 15,
    beat1_duration: 2,
    beat2_duration: 3
  },
  guardrails: {
    max_lines: 2,
    banned_words: ["hope", "please", "let me know", "new track"],
    banned_phrases: [
      "hope you like",
      "let me know",
      "new track",
      "follow for follow",
      "follow-for-follow",
      "tag a friend",
      "dm me"
    ],
    allowed_tones: ["direct", "confident", "curious"],
    max_novelty: 0.3,
    allow_sync_critical: false,
    allow_hands_keys_literal: false,
    beat1_max_chars: 140,
    beat1_triggers: [
      "if",
      "this",
      "you",
      "wait",
      "keep",
      "skip",
      "watch",
      "only",
      "unreleased",
      "early"
    ],
    beat1_no_questions: false
  },
  spam_guardrails: {
    pending_drafts_cap: 4,
    daily_draft_upload_cap: 3,
    min_gap_hours: 3.5,
    window_jitter_minutes: 35,
    recipe_cooldown_days: 7,
    beat1_exact_cooldown_days: 14,
    beat2_exact_cooldown_days: 7,
    caption_exact_cooldown_days: 14,
    beat1_prefix_words: 3,
    beat1_prefix_cooldown_days: 7,
    snippet_cooldown_hours: 72,
    track_cooldown_hours: 24,
    clip_cooldown_hours: 48,
    montage_template_cooldown_hours: 72,
    max_hook_family_per_day: 2,
    max_hook_family_per_week: 5,
    max_anti_algo_per_week: 3,
    max_comment_cta_per_day: 1,
    max_same_cta_intent_in_row: 2,
    max_snippet_style_per_day: 2,
    hashtag_count_min: 2,
    hashtag_count_max: 5,
    retire_score_threshold: 0.28,
    retire_min_posts: 3
  },
  recovery_mode: {
    enabled: true,
    days: 7,
    views_drop_threshold: 0.6,
    view2s_drop_threshold: 0.25,
    spam_error_threshold: 1,
    cadence_per_day: 2,
    allow_montage: false,
    allow_comment_cta: false,
    hashtag_max: 2
  },
  explore_ratio: 0.3,
  min_compatibility_score: 0.6,
  snippet_duration_range: [7, 12],
  post_time_windows: ["11:00-12:30", "16:00-17:30", "20:30-22:30"],
  viral_engine: {
    require_two_beats: true,
    require_montage_first_cut: true,
    require_moment_3_to_7: true,
    require_second_moment_7_to_11: true,
    allowed_cta_types: ["KEEP_SKIP", "COMMENT_VIBE", "FOLLOW_FULL", "SAVE_REWATCH", "LINK_DM", "PICK_AB"],
    explore_ratio: 0.25,
    recipe_daily_max: 3,
    preflight_min_score: 40,
    preflight_review_score: 60
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
    autopilot_enabled: false,
    autopilot_interval_hours: 4,
    plateau_days: 7,
    test_dimensions: {
      recipe: true,
      variant: false,
      cta: false,
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
  caption_marker_enabled: false,
  caption_marker_prefix: "#mbp",
  metrics_match_window_minutes: 180,
  caption_topic_keywords: [
    "unreleased melodic techno ID",
    "melodic house drop",
    "progressive techno hook"
  ],
  caption_hashtags: ["#melodictechno", "#producer", "#daw"],
  voice_profile: "jaspro",
  voice_banned_words: [
    "vibe",
    "feel the beat",
    "turn it up",
    "this one hits",
    "drop incoming",
    "you won't believe",
    "pov:",
    "bestie",
    "bro",
    "let's go",
    "no cap",
    "slaps",
    "fire",
    "banger",
    "insane",
    "crazy",
    "omg",
    "goosebumps",
    "chills",
    "emotional",
    "so beautiful"
  ],
  voice_examples_limit: 20
};
