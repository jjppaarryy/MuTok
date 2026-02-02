import { labelStyle } from "./rulesStyles";
import RuleSlider from "./RuleSlider";
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
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>
        If performance drops, the system slows down to protect your account.
      </div>
      <div className="grid-3" style={{ gap: 20 }}>
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
        <RuleSlider
          label="Duration (days)"
          value={recovery.days}
          min={1}
          max={30}
          step={1}
          helper="How long recovery stays on after a drop."
          onChange={(value) => onChange("recovery_mode", { ...recovery, days: value })}
        />
        <RuleSlider
          label="Posts per day in recovery"
          value={recovery.cadence_per_day}
          min={1}
          max={5}
          step={1}
          helper="Reduced posting pace while recovering."
          onChange={(value) => onChange("recovery_mode", { ...recovery, cadence_per_day: value })}
        />
        <RuleSlider
          label="Views drop threshold"
          value={recovery.views_drop_threshold}
          min={0}
          max={1}
          step={0.05}
          helper="Triggers recovery if views drop too much."
          onChange={(value) => onChange("recovery_mode", { ...recovery, views_drop_threshold: value })}
        />
        <RuleSlider
          label="2s view drop threshold"
          value={recovery.view2s_drop_threshold}
          min={0}
          max={1}
          step={0.05}
          helper="Triggers recovery if early retention drops."
          onChange={(value) => onChange("recovery_mode", { ...recovery, view2s_drop_threshold: value })}
        />
        <RuleSlider
          label="Spam error threshold"
          value={recovery.spam_error_threshold}
          min={0}
          max={10}
          step={1}
          helper="How many spam errors trigger recovery."
          onChange={(value) => onChange("recovery_mode", { ...recovery, spam_error_threshold: value })}
        />
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
        <RuleSlider
          label="Max hashtags"
          value={recovery.hashtag_max}
          min={1}
          max={10}
          step={1}
          helper="Reduce hashtags while recovering."
          onChange={(value) => onChange("recovery_mode", { ...recovery, hashtag_max: value })}
        />
      </div>
    </div>
  );
}
