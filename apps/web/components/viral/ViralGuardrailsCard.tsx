import ActionButton from "../ActionButton";
import { CTA_LABELS, CTA_OPTIONS } from "../recipes/recipeTypes";

type ViralSettings = {
  require_two_beats: boolean;
  require_montage_first_cut: boolean;
  require_moment_3_to_7: boolean;
  require_second_moment_7_to_11: boolean;
  allowed_cta_types: string[];
};

const ctaOptions = CTA_OPTIONS.map((id) => ({ id, label: CTA_LABELS[id] ?? id }));
const ctaPresets = [
  {
    id: "growth",
    label: "Growth mode",
    helper: "Adds follow + comment prompts to your list.",
    intents: ["FOLLOW_FULL", "COMMENT_VIBE"]
  },
  {
    id: "retention",
    label: "Retention mode",
    helper: "Adds save / rewatch hooks to your list.",
    intents: ["SAVE_REWATCH"]
  },
  {
    id: "conversion",
    label: "Conversion mode",
    helper: "Adds link / DM hooks to your list.",
    intents: ["LINK_DM"]
  }
];

const cardStyle: React.CSSProperties = {
  padding: 48,
  borderRadius: 24,
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: 32
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  fontSize: 16,
  fontWeight: 600,
  color: "#334155",
  cursor: "pointer"
};

type ViralGuardrailsCardProps = {
  viral: ViralSettings;
  onUpdate: (updates: Partial<ViralSettings>) => void;
  onToggleCta: (id: string) => void;
  onSave: () => void;
};

export default function ViralGuardrailsCard({
  viral,
  onUpdate,
  onToggleCta,
  onSave
}: ViralGuardrailsCardProps) {
  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Guardrails
        </div>
        <ActionButton label="Save policy" onClick={onSave} />
      </div>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={viral.require_two_beats}
          onChange={(event) => onUpdate({ require_two_beats: event.target.checked })}
          style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
        />
        Two-beat on-screen text required
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Keeps hooks in 2 lines.</span>
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={viral.require_montage_first_cut}
          onChange={(event) =>
            onUpdate({ require_montage_first_cut: event.target.checked })
          }
          style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
        />
        Montage first cut around 2.5s
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Faster hook engagement.</span>
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={viral.require_moment_3_to_7}
          onChange={(event) => onUpdate({ require_moment_3_to_7: event.target.checked })}
          style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
        />
        Early hook in snippet
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Auto-detected lift around 3–7s.</span>
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={viral.require_second_moment_7_to_11}
          onChange={(event) =>
            onUpdate({ require_second_moment_7_to_11: event.target.checked })
          }
          style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
        />
        Second hook in snippet
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Auto-detected lift around 7–11s.</span>
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          CTA presets
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {ctaPresets.map((preset) => (
            <div key={preset.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ActionButton
                label={preset.label}
                variant="secondary"
                onClick={() =>
                  onUpdate({
                    allowed_cta_types: Array.from(
                      new Set([...(viral.allowed_cta_types ?? []), ...preset.intents])
                    )
                  })
                }
              />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{preset.helper}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Allowed CTA types
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {ctaOptions.map((cta) => (
            <label key={cta.id} style={labelStyle}>
              <input
                type="checkbox"
                checked={viral.allowed_cta_types.includes(cta.id)}
                onChange={() => onToggleCta(cta.id)}
                style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
              />
              {cta.label}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
