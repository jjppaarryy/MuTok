import ActionButton from "../ActionButton";

type Cta = {
  id: string;
  name: string;
  template: string;
  intent: string;
  status: string;
  locked: boolean;
};

const cardStyle: React.CSSProperties = {
  padding: 48,
  borderRadius: 24,
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: 24
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 600,
  color: "#0f172a",
  outline: "none"
};

type CtaLibraryCardProps = {
  ctas: Cta[];
  onChange: (ctas: Cta[]) => void;
  onSave: () => void;
};

export default function CtaLibraryCard({ ctas, onChange, onSave }: CtaLibraryCardProps) {
  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          CTA library
        </div>
        <ActionButton label="Save CTAs" onClick={onSave} />
      </div>
      <div style={{ fontSize: 14, color: "#64748b" }}>
        Turn CTAs on/off and lock the ones you never want changed.
      </div>
      {ctas.length === 0 ? (
        <div style={{ fontSize: 14, color: "#94a3b8" }}>No CTAs yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {ctas.map((cta) => (
            <div key={cta.id} style={{ padding: 16, borderRadius: 16, border: "1px solid #e2e8f0", background: "#f8fafc", display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{cta.name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{cta.intent}</div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={cta.locked}
                    onChange={(event) =>
                      onChange(
                        ctas.map((item) =>
                          item.id === cta.id ? { ...item, locked: event.target.checked } : item
                        )
                      )
                    }
                    style={{ width: 20, height: 20, borderRadius: 6, accentColor: "#0f172a" }}
                  />
                  Manual lock
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <input style={inputStyle} value={cta.template} readOnly />
                <select
                  style={inputStyle}
                  value={cta.status}
                  onChange={(event) =>
                    onChange(
                      ctas.map((item) =>
                        item.id === cta.id ? { ...item, status: event.target.value } : item
                      )
                    )
                  }
                >
                  {["active", "testing", "retired"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
