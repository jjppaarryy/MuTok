"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import PageHeader from "../../components/PageHeader";
import RulesForm from "../../components/rules/RulesForm";
import { defaultRules, type RulesSettings } from "../../lib/rulesConfig";

export default function RulesPage() {
  const [rules, setRules] = useState<RulesSettings>(defaultRules);
  const [message, setMessage] = useState<string | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState<boolean>(false);

  const summaryLines = [
    `${rules.cadence_per_day} posts/day in ${rules.post_time_windows.length} windows`,
    `Minimum gap: ${rules.spam_guardrails.min_gap_hours}h`,
    `Hook cooldown: ${rules.spam_guardrails.recipe_cooldown_days} days`,
    `Daily uploads: max ${rules.spam_guardrails.daily_draft_upload_cap}`
  ];

  const loadData = async () => {
    const rulesRes = await fetch("/api/settings");
    const rulesJson = (await rulesRes.json()) as { rules: RulesSettings };
    setRules({ ...defaultRules, ...rulesJson.rules });

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
        title="Safety & Schedule"
        description="Set posting windows and safety rules to protect your account."
        tip="Set this once, then adjust as you learn."
        actions={
          <div className="wrap-actions">
            <ActionButton
              label="Save safety rules"
              onClick={saveRules}
              title="Save your rules and schedule."
            />
            <ActionButton
              label={schedulerRunning ? "Stop auto-run" : "Start auto-run"}
              variant="secondary"
              onClick={toggleScheduler}
              title="Turn the auto-run on or off."
            />
          </div>
        }
      />

      <div className="grid-2" style={{ gap: 24 }}>
        <div style={{ padding: 24, borderRadius: 20, border: "1px solid #e2e8f0", backgroundColor: "white" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>
            Recommended presets
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <button
              onClick={() => applyPreset("week1")}
              style={{ padding: "12px 20px", borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "white", fontWeight: 700, color: "#0f172a", cursor: "pointer", textAlign: "left" }}
            >
              Week 1 Hook Test
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Best for: learning quickly with more variety.
              </div>
            </button>
            <button
              onClick={() => applyPreset("scale")}
              style={{ padding: "12px 20px", borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "white", fontWeight: 700, color: "#0f172a", cursor: "pointer", textAlign: "left" }}
            >
              Scale Winners
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Best for: posting proven hooks more often.
              </div>
            </button>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
            Pick a preset, then tweak the details below.
          </div>
        </div>

        <div style={{ padding: 24, borderRadius: 20, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>
            Safety basics
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8, color: "#475569" }}>
            {summaryLines.map((line) => (
              <div key={line} style={{ fontSize: 14 }}>• {line}</div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
            Hook copy is managed on the Hooks page.
          </div>
        </div>
      </div>

      {message ? (
        <div style={{ padding: '20px 32px', borderRadius: 16, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: 16, fontWeight: 600, border: '1px solid #a7f3d0' }}>
          {message}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '1fr' }}>
        <RulesForm rules={rules} onChange={updateRule} />
      </div>
    </div>
  );
}
