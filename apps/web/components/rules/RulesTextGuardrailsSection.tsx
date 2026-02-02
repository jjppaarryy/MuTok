import { inputStyle, labelStyle } from "./rulesStyles";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesTextGuardrailsSection({ rules, onChange }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Text Guardrails
      </h3>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>
        Keep hooks clean and on-brand. These are safety checks on the text itself.
      </div>
      <label style={labelStyle}>
        Max text lines
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
          Limits on-screen lines to keep it readable.
        </div>
        <input
          type="number"
          min={1}
          value={rules.guardrails.max_lines}
          onChange={(event) =>
            onChange("guardrails", {
              ...rules.guardrails,
              max_lines: Number(event.target.value)
            })
          }
          style={inputStyle}
        />
      </label>
      <label style={labelStyle}>
        Banned phrases (one per line)
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
          Any hook or caption containing these phrases is blocked.
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 120, lineHeight: 1.5 }}
          value={rules.guardrails.banned_phrases.join("\n")}
          onChange={(event) =>
            onChange("guardrails", {
              ...rules.guardrails,
              banned_phrases: event.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
            })
          }
        />
      </label>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rules.guardrails.allow_sync_critical}
            onChange={(event) =>
              onChange("guardrails", {
                ...rules.guardrails,
                allow_sync_critical: event.target.checked
              })
            }
            style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
          />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
            Allow sync-critical clips
          </span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Use clips that must stay synced with the beat.
          </span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rules.guardrails.allow_hands_keys_literal}
            onChange={(event) =>
              onChange("guardrails", {
                ...rules.guardrails,
                allow_hands_keys_literal: event.target.checked
              })
            }
            style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
          />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
            Allow hands/keys literal clips
          </span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Use clips that show hands/keys explicitly.
          </span>
        </label>
      </div>
    </div>
  );
}
