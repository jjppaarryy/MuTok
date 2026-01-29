import { inputStyle, labelStyle } from "./rulesStyles";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesHashtagsSection({ rules, onChange }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Captions
      </h3>
      <div style={{ padding: "8px 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rules.caption_marker_enabled}
            onChange={(event) => onChange("caption_marker_enabled", event.target.checked)}
            style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
          />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
            Enable caption marker
          </span>
        </label>
      </div>
      <label style={labelStyle}>
        Hashtags
        <textarea
          style={{ ...inputStyle, minHeight: 100, lineHeight: 1.5 }}
          value={rules.caption_hashtags.join(" ")}
          onChange={(event) =>
            onChange(
              "caption_hashtags",
              event.target.value
                .split(/\s+/)
                .map((tag) => tag.trim())
                .filter(Boolean)
            )
          }
        />
      </label>
    </div>
  );
}
