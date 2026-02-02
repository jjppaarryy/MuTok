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
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>
        Choose the windows you prefer to post in. The system will pick times inside these ranges.
      </div>
      <label style={labelStyle}>
        Post time windows (HH:MM or HH:MM-HH:MM)
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
          Example: 11:00-12:30 or 20:30-22:30
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {rules.post_time_windows.map((time, index) => (
            <input
              key={`${time}-${index}`}
              type="text"
              placeholder="11:00-12:30"
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
