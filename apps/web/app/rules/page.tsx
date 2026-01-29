"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import PageHeader from "../../components/PageHeader";
import RulesForm from "../../components/rules/RulesForm";
import HookRecipesEditor from "../../components/rules/HookRecipesEditor";

type RulesSettings = {
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

type HookRecipe = {
  id: string;
  name: string;
  enabled: boolean;
  locked: boolean;
  beat1Templates: string[];
  beat2Templates: string[];
  ctaType: string;
  allowedSnippetTypes: string[];
  disallowedContainers: string[];
  variants?: Array<{
    id: string;
    beat1: string;
    beat2: string;
    locked: boolean;
    status: string;
  }>;
};

const defaultRules: RulesSettings = {
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

export default function RulesPage() {
  const [rules, setRules] = useState<RulesSettings>(defaultRules);
  const [recipes, setRecipes] = useState<HookRecipe[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState<boolean>(false);

  const loadData = async () => {
    const rulesRes = await fetch("/api/settings");
    const rulesJson = (await rulesRes.json()) as { rules: RulesSettings };
    setRules({ ...defaultRules, ...rulesJson.rules });

    const recipeRes = await fetch("/api/hook-recipes");
    const recipeJson = (await recipeRes.json()) as { recipes: HookRecipe[] };
    setRecipes(recipeJson.recipes ?? []);

    const schedulerRes = await fetch("/api/scheduler/status");
    const schedulerJson = (await schedulerRes.json()) as { running: boolean };
    setSchedulerRunning(Boolean(schedulerJson.running));
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateRule = (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  const saveRules = async () => {
    setMessage(null);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rules)
    });
    setMessage("Rules saved successfully.");
  };

  const saveRecipes = async () => {
    setMessage(null);
    await fetch("/api/hook-recipes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipes })
    });
    setMessage("Hook recipes saved.");
  };

  const applyPreset = (preset: "week1" | "scale") => {
    if (preset === "week1") {
      setRules((prev) => ({
        ...prev,
        allowed_containers: ["static_daw", "montage"],
        explore_ratio: 0.5,
        min_compatibility_score: 0.72
      }));
      setMessage("Preset applied: Week 1 Hook Test");
      return;
    }

    setRules((prev) => ({
      ...prev,
      allowed_containers: ["static_daw"],
      explore_ratio: 0.15,
      min_compatibility_score: 0.8
    }));
    setMessage("Preset applied: Scale Winners");
  };

  const toggleScheduler = async () => {
    if (schedulerRunning) {
      await fetch("/api/scheduler/stop", { method: "POST" });
      setSchedulerRunning(false);
      setMessage("Scheduler stopped.");
      return;
    }
    await fetch("/api/scheduler/start", { method: "POST" });
    setSchedulerRunning(true);
    setMessage("Scheduler started.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PageHeader
        title="Guardrails & Recipes"
        description="Define what is allowed and the starting hook library."
        tip="Step 3: set guardrails before filling the queue."
        actions={
          <div style={{ display: 'flex', gap: 16 }}>
            <ActionButton
              label="Save settings"
              onClick={saveRules}
              title="Save your rules and schedule."
            />
            <ActionButton
              label="Save recipes"
              variant="secondary"
              onClick={saveRecipes}
              title="Save the hook templates the AI can use."
            />
            <ActionButton
              label={schedulerRunning ? "Stop scheduler" : "Start scheduler"}
              variant="secondary"
              onClick={toggleScheduler}
              title="Turn the auto-run on or off."
            />
          </div>
        }
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748b" }}>
        Pick a preset, tweak the rules, then save.
        <InlineTip text="If you want manual control, keep the scheduler off." />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Presets:</div>
        <button
          onClick={() => applyPreset("week1")}
          style={{ padding: '12px 24px', borderRadius: 50, border: '2px solid #e2e8f0', backgroundColor: 'white', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
        >
          Week 1 Hook Test
        </button>
        <button
          onClick={() => applyPreset("scale")}
          style={{ padding: '12px 24px', borderRadius: 50, border: '2px solid #e2e8f0', backgroundColor: 'white', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
        >
          Scale Winners
        </button>
      </div>

      {message ? (
        <div style={{ padding: '20px 32px', borderRadius: 16, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: 16, fontWeight: 600, border: '1px solid #a7f3d0' }}>
          {message}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '1fr' }}>
        <RulesForm rules={rules} onChange={updateRule} />
        <HookRecipesEditor recipes={recipes} onChange={setRecipes} />
      </div>
    </div>
  );
}
