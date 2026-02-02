import type { RulesSettings } from "../../lib/rulesConfig";
import RulesBasicsSection from "./RulesBasicsSection";
import RulesMontageSection from "./RulesMontageSection";
import RulesScheduleSection from "./RulesScheduleSection";
import RulesHashtagsSection from "./RulesHashtagsSection";
import RulesTextOverlaySection from "./RulesTextOverlaySection";
import RulesTextGuardrailsSection from "./RulesTextGuardrailsSection";
import RulesSpamGuardrailsSection from "./RulesSpamGuardrailsSection";
import RulesRecoverySection from "./RulesRecoverySection";

type RulesFormProps = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesForm({ rules, onChange }: RulesFormProps) {
  const summaryItems = [
    `${rules.cadence_per_day} posts/day within ${rules.post_time_windows.length} windows`,
    `Min gap ${rules.spam_guardrails.min_gap_hours}h, jitter ${rules.spam_guardrails.window_jitter_minutes}m`,
    `Hooks won’t repeat for ${rules.spam_guardrails.recipe_cooldown_days} days`,
    `Daily uploads capped at ${rules.spam_guardrails.daily_draft_upload_cap}`,
    `Comment CTAs capped at ${rules.spam_guardrails.max_comment_cta_per_day}/day`,
    `Recovery mode: ${rules.recovery_mode.enabled ? "on" : "off"}`
  ];

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 20,
    backgroundColor: "white"
  };

  return (
    <div
      style={{ padding: 48, borderRadius: 24, display: "flex", flexDirection: "column", gap: 32 }}
      className="panel"
    >
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>Safety & Schedule Overview</h2>

      <div style={{ ...sectionStyle, backgroundColor: "#f8fafc" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
          What these settings do
        </div>
        <div style={{ display: "grid", gap: 8, color: "#475569" }}>
          {summaryItems.map((item) => (
            <div key={item} style={{ fontSize: 14 }}>
              • {item}
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <RulesScheduleSection rules={rules} onChange={onChange} />
      </div>

      <div style={sectionStyle}>
        <RulesBasicsSection rules={rules} onChange={onChange} />
      </div>

      <details style={sectionStyle}>
        <summary style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
          Posting safety caps
        </summary>
        <div style={{ marginTop: 20 }}>
          <RulesSpamGuardrailsSection rules={rules} onChange={onChange} />
        </div>
      </details>

      <details style={sectionStyle}>
        <summary style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
          Hook + text rules
        </summary>
        <div style={{ marginTop: 20, display: "grid", gap: 24 }}>
          <RulesTextOverlaySection rules={rules} onChange={onChange} />
          <RulesTextGuardrailsSection rules={rules} onChange={onChange} />
        </div>
      </details>

      <details style={sectionStyle}>
        <summary style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
          Montage rules
        </summary>
        <div style={{ marginTop: 20 }}>
          <RulesMontageSection rules={rules} onChange={onChange} />
        </div>
      </details>

      <details style={sectionStyle}>
        <summary style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
          Hashtags & captions
        </summary>
        <div style={{ marginTop: 20 }}>
          <RulesHashtagsSection rules={rules} onChange={onChange} />
        </div>
      </details>

      <details style={sectionStyle}>
        <summary style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
          Recovery mode
        </summary>
        <div style={{ marginTop: 20 }}>
          <RulesRecoverySection rules={rules} onChange={onChange} />
        </div>
      </details>
    </div>
  );
}
