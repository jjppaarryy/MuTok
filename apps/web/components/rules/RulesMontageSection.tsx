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
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>
        Control how fast montage clips cut and how many clips are used.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          Clip count (min)
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Fewer clips = slower pacing.
          </div>
          <input
            type="number"
            min={1}
            value={rules.montage.clip_count_min ?? rules.montage.clip_count}
            onChange={(event) =>
              onChange("montage", {
                ...rules.montage,
                clip_count_min: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          Clip count (max)
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Each video gets a random count between min and max.
          </div>
          <input
            type="number"
            min={1}
            value={rules.montage.clip_count_max ?? rules.montage.clip_count}
            onChange={(event) =>
              onChange("montage", {
                ...rules.montage,
                clip_count_max: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 2 }}>
          Clip duration range (sec)
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Lower values create quicker cuts.
          </div>
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
