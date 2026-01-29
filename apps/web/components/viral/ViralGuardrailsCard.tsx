import ActionButton from "../ActionButton";

type ViralSettings = {
  require_two_beats: boolean;
  require_montage_first_cut: boolean;
  require_moment_3_to_7: boolean;
  require_second_moment_7_to_11: boolean;
  allowed_cta_types: string[];
};

const ctaOptions = [
  { id: "KEEP_SKIP", label: "KEEP / SKIP" },
  { id: "COMMENT_VIBE", label: "Comment vibe" },
  { id: "FOLLOW_FULL", label: "Follow for full ID" },
  { id: "PICK_AB", label: "Pick A/B" }
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
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={viral.require_moment_3_to_7}
          onChange={(event) => onUpdate({ require_moment_3_to_7: event.target.checked })}
          style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
        />
        Snippet must contain a moment at 3–7s
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
        Snippet must contain a second moment at 7–11s
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
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
