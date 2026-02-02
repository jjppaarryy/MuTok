import ActionButton from "../ActionButton";
import { CTA_LABELS, CTA_OPTIONS, RecipeForm, SNIPPET_LABELS, SNIPPET_OPTIONS } from "./recipeTypes";

type RecipeCardProps = {
  recipe: RecipeForm;
  stats?: {
    score7d: number;
    count7d: number;
    score14d: number;
    count14d: number;
  };
  isRetireCandidate?: boolean;
  onChange: (id: string, updates: Partial<RecipeForm>) => void;
  onSave: (recipe: RecipeForm) => void;
  onDuplicate: (recipe: RecipeForm) => void;
  onToggleArchive: (recipe: RecipeForm) => void;
};

const cardStyle: React.CSSProperties = {
  padding: 32,
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  backgroundColor: "white",
  display: "flex",
  flexDirection: "column",
  gap: 20
};

const inputStyle: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 500,
  color: "#0f172a",
  outline: "none"
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.5px"
};

export default function RecipeCard({
  recipe,
  stats,
  isRetireCandidate,
  onChange,
  onSave,
  onDuplicate,
  onToggleArchive
}: RecipeCardProps) {
  return (
    <div style={cardStyle}>
      {(stats || isRetireCandidate) && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#475569" }}>
          {stats ? (
            <div>
              Score 7d: <strong>{stats.score7d.toFixed(2)}</strong> ({stats.count7d})
            </div>
          ) : null}
          {stats ? (
            <div>
              Score 14d: <strong>{stats.score14d.toFixed(2)}</strong> ({stats.count14d})
            </div>
          ) : null}
          {isRetireCandidate ? (
            <div style={{ color: "#b91c1c", fontWeight: 700 }}>Retire suggested</div>
          ) : null}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <input
          style={{ ...inputStyle, fontSize: 16 }}
          value={recipe.name}
          onChange={(event) => onChange(recipe.id, { name: event.target.value })}
        />
        <div className="wrap-actions">
          <ActionButton label="Save" onClick={() => onSave(recipe)} />
          <ActionButton label="Duplicate" variant="secondary" onClick={() => onDuplicate(recipe)} />
          <ActionButton
            label={recipe.enabled ? "Archive" : "Unarchive"}
            variant="secondary"
            onClick={() => onToggleArchive(recipe)}
          />
        </div>
      </div>

      <div className="grid-2">
        <label style={labelStyle}>
          Beat 1
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            First line. Keep it punchy.
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 80 }}
            value={recipe.beat1Text}
            onChange={(event) => onChange(recipe.id, { beat1Text: event.target.value })}
          />
        </label>
        <label style={labelStyle}>
          Beat 2
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
            Second line. Add tension or curiosity.
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 80 }}
            value={recipe.beat2Text}
            onChange={(event) => onChange(recipe.id, { beat2Text: event.target.value })}
          />
        </label>
      </div>

      <label style={labelStyle}>
        Caption
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
          This becomes the TikTok caption. Keep it simple and on-brand.
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 80 }}
          value={recipe.captionText}
          onChange={(event) => onChange(recipe.id, { captionText: event.target.value })}
        />
      </label>

      <div className="grid-3">
        <label style={labelStyle}>
          CTA intent
          <select
            style={inputStyle}
            value={recipe.ctaType}
            onChange={(event) => onChange(recipe.id, { ctaType: event.target.value })}
          >
            {CTA_OPTIONS.map((cta) => (
              <option key={cta} value={cta}>
                {CTA_LABELS[cta] ?? cta}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Container allowed
          <select
            style={inputStyle}
            value={recipe.containerAllowed}
            onChange={(event) =>
              onChange(recipe.id, { containerAllowed: event.target.value as RecipeForm["containerAllowed"] })
            }
          >
            <option value="both">Both</option>
            <option value="static_daw">Static DAW</option>
            <option value="montage">Montage</option>
          </select>
        </label>
        <label style={labelStyle}>
          Snippet strategy
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            {SNIPPET_OPTIONS.map((option) => (
              <label key={option} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={recipe.allowedSnippetTypes.includes(option)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...recipe.allowedSnippetTypes, option]
                      : recipe.allowedSnippetTypes.filter((item) => item !== option);
                    onChange(recipe.id, { allowedSnippetTypes: next });
                  }}
                />
                {SNIPPET_LABELS[option] ?? option}
              </label>
            ))}
          </div>
        </label>
      </div>
    </div>
  );
}
