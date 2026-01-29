import { inputStyle, labelStyle } from "./rulesStyles";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesScheduleSection({ rules, onChange }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Scheduling
      </h3>
      <label style={labelStyle}>
        Post time windows (HH:MM or HH:MM-HH:MM)
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {rules.post_time_windows.map((time, index) => (
            <input
              key={`${time}-${index}`}
              type="text"
              value={time}
              onChange={(event) => {
                const next = [...rules.post_time_windows];
                next[index] = event.target.value;
                onChange("post_time_windows", next);
              }}
              style={inputStyle}
            />
          ))}
        </div>
      </label>
    </div>
  );
}
