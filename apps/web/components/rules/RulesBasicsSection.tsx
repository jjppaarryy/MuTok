import { inputStyle, labelStyle } from "./rulesStyles";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesBasicsSection({ rules, onChange }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Basics
      </h3>
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <label style={labelStyle}>
          Cadence per day
          <input
            type="number"
            min={1}
            value={rules.cadence_per_day}
            onChange={(event) => onChange("cadence_per_day", Number(event.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Target queue size
          <input
            type="number"
            min={1}
            value={rules.target_queue_size}
            onChange={(event) => onChange("target_queue_size", Number(event.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Explore ratio
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={rules.explore_ratio}
            onChange={(event) => onChange("explore_ratio", Number(event.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Min compatibility score
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={rules.min_compatibility_score}
            onChange={(event) => onChange("min_compatibility_score", Number(event.target.value))}
            style={inputStyle}
          />
        </label>
      </div>
    </div>
  );
}
