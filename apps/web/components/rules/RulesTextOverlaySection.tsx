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
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>
        Control how on-screen text looks in your videos.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          Font size (px)
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Bigger text is easier to read on mobile.
          </div>
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
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Keeps text away from the edges.
          </div>
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
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Moves text up or down.
          </div>
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
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Higher makes the text background more solid.
          </div>
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
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Adds breathing room around the text.
          </div>
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
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            How long the first line stays on screen.
          </div>
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
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            How long the second line stays on screen.
          </div>
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
