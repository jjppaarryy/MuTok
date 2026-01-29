"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import PageHeader from "../../components/PageHeader";
import RulesForm from "../../components/rules/RulesForm";
import { defaultRules, type RulesSettings } from "../../lib/rulesConfig";

export default function RulesPage() {
  const [rules, setRules] = useState<RulesSettings>(defaultRules);
  const [message, setMessage] = useState<string | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState<boolean>(false);

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
        title="Guardrails"
        description="Define what is allowed and the scheduling rules."
        tip="Step 3: set guardrails before filling the queue."
        actions={
          <div style={{ display: 'flex', gap: 16 }}>
            <ActionButton
              label="Save settings"
              onClick={saveRules}
              title="Save your rules and schedule."
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
      <div style={{ fontSize: 14, color: "#64748b" }}>
        Manage fixed captions on the Recipes page.
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
      </div>
    </div>
  );
}
