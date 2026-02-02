"use client";

import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import CtaLibraryCard from "../../components/viral/CtaLibraryCard";
import OptimiserPolicyCard from "../../components/viral/OptimiserPolicyCard";
import ViralGuardrailsCard from "../../components/viral/ViralGuardrailsCard";

type ViralSettings = {
  require_two_beats: boolean;
  require_montage_first_cut: boolean;
  require_moment_3_to_7: boolean;
  require_second_moment_7_to_11: boolean;
  allowed_cta_types: string[];
};

type OptimiserPolicy = {
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

type RulesSettings = {
  viral_engine: ViralSettings;
  optimiser_policy: OptimiserPolicy;
} & Record<string, unknown>;

type Cta = {
  id: string;
  name: string;
  template: string;
  intent: string;
  status: string;
  locked: boolean;
};

type SchedulerStatus = {
  running: boolean;
  mode?: string | null;
  lastRunAt?: string | null;
  lastError?: string | null;
};

export default function ViralEnginePage() {
  const [rules, setRules] = useState<RulesSettings>({
    viral_engine: {
      require_two_beats: true,
      require_montage_first_cut: true,
      require_moment_3_to_7: true,
      require_second_moment_7_to_11: true,
      allowed_cta_types: ["KEEP_SKIP", "COMMENT_VIBE", "FOLLOW_FULL", "SAVE_REWATCH", "LINK_DM", "PICK_AB"]
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
    }
  });
  const [ctas, setCtas] = useState<Cta[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);

  const loadSettings = async () => {
    const response = await fetch("/api/settings");
    const data = (await response.json()) as { rules: RulesSettings };
    if (data.rules) setRules((prev) => ({ ...prev, ...data.rules }));
    const ctaResponse = await fetch("/api/ctas");
    const ctaData = (await ctaResponse.json()) as { ctas: Cta[] };
    setCtas(ctaData.ctas ?? []);
    const schedulerResponse = await fetch("/api/scheduler/status");
    const schedulerData = (await schedulerResponse.json()) as SchedulerStatus;
    setSchedulerStatus(schedulerData);
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const saveSettings = async () => {
    setMessage(null);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rules)
    });
    if (rules.optimiser_policy.autopilot_enabled) {
      await fetch("/api/scheduler/start", { method: "POST" });
    } else {
      await fetch("/api/scheduler/stop", { method: "POST" });
    }
    setMessage("AI optimisation policy saved.");
    await loadSettings();
  };

  const toggleCta = (id: string) => {
    setRules((prev) => ({
      ...prev,
      viral_engine: {
        ...prev.viral_engine,
        allowed_cta_types: prev.viral_engine.allowed_cta_types.includes(id)
          ? prev.viral_engine.allowed_cta_types.filter((t) => t !== id)
          : [...prev.viral_engine.allowed_cta_types, id]
      }
    }));
  };

  const saveCtas = async () => {
    setMessage(null);
    await fetch("/api/ctas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ctas })
    });
    setMessage("CTA library saved.");
  };

  const updateViral = (updates: Partial<ViralSettings>) => {
    setRules((prev) => ({
      ...prev,
      viral_engine: { ...prev.viral_engine, ...updates }
    }));
  };

  const updatePolicy = (updates: Partial<OptimiserPolicy>) => {
    setRules((prev) => ({
      ...prev,
      optimiser_policy: { ...prev.optimiser_policy, ...updates }
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PageHeader
        title="Testing"
        description="Choose what the system is allowed to test while it learns."
        tip="Use this if you want tighter control over experimentation."
      />

      <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569" }}>
        Think of these as “test boundaries.” They don’t change your hooks, they just control which variations are allowed.
      </div>

      {message ? (
        <div style={{ padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', backgroundColor: '#f0fdf4', fontSize: 14, color: '#059669' }}>
          {message}
        </div>
      ) : null}
      {schedulerStatus ? (
        <div style={{ padding: 16, borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#fff7ed", fontSize: 13, color: "#9a3412" }}>
          Autopilot: {schedulerStatus.running ? "Running" : "Stopped"}{" "}
          {schedulerStatus.mode ? `(${schedulerStatus.mode})` : ""}{" "}
          {schedulerStatus.lastRunAt ? `· Last run ${new Date(schedulerStatus.lastRunAt).toLocaleString()}` : ""}
          {schedulerStatus.lastError ? ` · Last error: ${schedulerStatus.lastError}` : ""}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          Guardrails choose which beats, snippets, and CTA types are allowed in testing.
        </div>
        <ViralGuardrailsCard
          viral={rules.viral_engine}
          onUpdate={updateViral}
          onToggleCta={toggleCta}
          onSave={saveSettings}
        />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          Autopilot controls how fast the system explores and promotes winners.
        </div>
        <OptimiserPolicyCard
          policy={rules.optimiser_policy}
          onUpdate={updatePolicy}
        />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          CTA library lets you lock or pause specific calls-to-action.
        </div>
        <CtaLibraryCard ctas={ctas} onChange={setCtas} onSave={saveCtas} />
      </div>
    </div>
  );
}
