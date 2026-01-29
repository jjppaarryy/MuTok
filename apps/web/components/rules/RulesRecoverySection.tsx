import { inputStyle, labelStyle } from "./rulesStyles";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesRecoverySection({ rules, onChange }: Props) {
  const recovery = rules.recovery_mode;
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Recovery Mode
      </h3>
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <label style={labelStyle}>
          Enabled
          <input
            type="checkbox"
            checked={recovery.enabled}
            onChange={(event) =>
              onChange("recovery_mode", { ...recovery, enabled: event.target.checked })
            }
            style={{ width: 24, height: 24, marginTop: 12, accentColor: "#fe2c55" }}
          />
        </label>
        <label style={labelStyle}>
          Duration (days)
          <input
            type="number"
            min={1}
            max={30}
            value={recovery.days}
            onChange={(event) =>
              onChange("recovery_mode", { ...recovery, days: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Cadence per day
          <input
            type="number"
            min={1}
            max={5}
            value={recovery.cadence_per_day}
            onChange={(event) =>
              onChange("recovery_mode", {
                ...recovery,
                cadence_per_day: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Views drop threshold
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={recovery.views_drop_threshold}
            onChange={(event) =>
              onChange("recovery_mode", {
                ...recovery,
                views_drop_threshold: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          View2s drop threshold
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={recovery.view2s_drop_threshold}
            onChange={(event) =>
              onChange("recovery_mode", {
                ...recovery,
                view2s_drop_threshold: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Spam error threshold
          <input
            type="number"
            min={0}
            max={10}
            value={recovery.spam_error_threshold}
            onChange={(event) =>
              onChange("recovery_mode", {
                ...recovery,
                spam_error_threshold: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Allow montage
          <input
            type="checkbox"
            checked={recovery.allow_montage}
            onChange={(event) =>
              onChange("recovery_mode", { ...recovery, allow_montage: event.target.checked })
            }
            style={{ width: 24, height: 24, marginTop: 12, accentColor: "#fe2c55" }}
          />
        </label>
        <label style={labelStyle}>
          Allow comment CTA
          <input
            type="checkbox"
            checked={recovery.allow_comment_cta}
            onChange={(event) =>
              onChange("recovery_mode", { ...recovery, allow_comment_cta: event.target.checked })
            }
            style={{ width: 24, height: 24, marginTop: 12, accentColor: "#fe2c55" }}
          />
        </label>
        <label style={labelStyle}>
          Max hashtags
          <input
            type="number"
            min={1}
            max={10}
            value={recovery.hashtag_max}
            onChange={(event) =>
              onChange("recovery_mode", {
                ...recovery,
                hashtag_max: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
      </div>
    </div>
  );
}
