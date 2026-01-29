import { inputStyle, labelStyle } from "./rulesStyles";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesMontageSection({ rules, onChange }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Montage
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          Clip count
          <input
            type="number"
            min={1}
            value={rules.montage.clip_count}
            onChange={(event) =>
              onChange("montage", {
                ...rules.montage,
                clip_count: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 2 }}>
          Clip duration range (sec)
          <div style={{ display: "flex", gap: 12 }}>
            <input
              type="number"
              min={0.2}
              step={0.1}
              value={rules.montage.clip_duration_range[0]}
              onChange={(event) =>
                onChange("montage", {
                  ...rules.montage,
                  clip_duration_range: [
                    Number(event.target.value),
                    rules.montage.clip_duration_range[1]
                  ]
                })
              }
              style={inputStyle}
            />
            <input
              type="number"
              min={0.2}
              step={0.1}
              value={rules.montage.clip_duration_range[1]}
              onChange={(event) =>
                onChange("montage", {
                  ...rules.montage,
                  clip_duration_range: [
                    rules.montage.clip_duration_range[0],
                    Number(event.target.value)
                  ]
                })
              }
              style={inputStyle}
            />
          </div>
        </label>
      </div>
    </div>
  );
}
