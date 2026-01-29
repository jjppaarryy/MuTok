import { inputStyle, labelStyle } from "./rulesStyles";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesTextOverlaySection({ rules, onChange }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Text Overlay
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          Font size (px)
          <input
            type="number"
            min={24}
            max={120}
            value={rules.text_overlay?.font_size ?? 58}
            onChange={(event) =>
              onChange("text_overlay", {
                ...rules.text_overlay,
                font_size: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          Side margin (px)
          <input
            type="number"
            min={20}
            max={300}
            value={rules.text_overlay?.margin_x ?? 100}
            onChange={(event) =>
              onChange("text_overlay", {
                ...rules.text_overlay,
                margin_x: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          Top margin (px)
          <input
            type="number"
            min={20}
            max={500}
            value={rules.text_overlay?.margin_top ?? 120}
            onChange={(event) =>
              onChange("text_overlay", {
                ...rules.text_overlay,
                margin_top: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 16 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          Box opacity (0-1)
          <input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={rules.text_overlay?.box_opacity ?? 0.6}
            onChange={(event) =>
              onChange("text_overlay", {
                ...rules.text_overlay,
                box_opacity: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          Box padding (px)
          <input
            type="number"
            min={0}
            max={50}
            value={rules.text_overlay?.box_padding ?? 15}
            onChange={(event) =>
              onChange("text_overlay", {
                ...rules.text_overlay,
                box_padding: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          Beat 1 duration (sec)
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={rules.text_overlay?.beat1_duration ?? 2}
            onChange={(event) =>
              onChange("text_overlay", {
                ...rules.text_overlay,
                beat1_duration: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          Beat 2 duration (sec)
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={rules.text_overlay?.beat2_duration ?? 3}
            onChange={(event) =>
              onChange("text_overlay", {
                ...rules.text_overlay,
                beat2_duration: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
      </div>
    </div>
  );
}
