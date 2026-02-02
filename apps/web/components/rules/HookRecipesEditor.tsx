import { CTA_LABELS, CTA_OPTIONS } from "../recipes/recipeTypes";

type HookRecipe = {
  id: string;
  name: string;
  enabled: boolean;
  locked: boolean;
  beat1Templates: string[];
  beat2Templates: string[];
  ctaType: string;
  allowedSnippetTypes: string[];
  disallowedContainers: string[];
  variants?: Array<{
    id: string;
    beat1: string;
    beat2: string;
    locked: boolean;
    status: string;
  }>;
};

type HookRecipesEditorProps = {
  recipes: HookRecipe[];
  onChange: (recipes: HookRecipe[]) => void;
};

const snippetTypes = ["moment_3_7", "moment_7_11"];
const snippetTypeLabels: Record<string, string> = {
  moment_3_7: "Early hook in snippet",
  moment_7_11: "Second hook in snippet"
};
const containers = ["static_daw", "montage"];

const cardStyle: React.CSSProperties = {
  padding: 48,
  borderRadius: 24,
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  gap: 32
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  padding: '16px 20px',
  fontSize: 16,
  fontWeight: 500,
  color: '#0f172a',
  outline: 'none'
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  lineHeight: 1.5
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 12
};

export default function HookRecipesEditor({
  recipes,
  onChange
}: HookRecipesEditorProps) {
  const updateRecipe = (id: string, updates: Partial<HookRecipe>) => {
    onChange(
      recipes.map((recipe) => (recipe.id === id ? { ...recipe, ...updates } : recipe))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>Hook Library</h2>

      {recipes.length === 0 ? (
        <div style={{ fontSize: 16, color: '#64748b' }}>Loading hook recipes…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {recipes.map((recipe) => (
            <div key={recipe.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                <input
                  style={inputStyle}
                  value={recipe.name}
                  onChange={(event) => updateRecipe(recipe.id, { name: event.target.value })}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={recipe.enabled}
                      onChange={(event) =>
                        updateRecipe(recipe.id, { enabled: event.target.checked })
                      }
                      style={{ width: 22, height: 22, borderRadius: 6, accentColor: '#fe2c55' }}
                    />
                    Enabled
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={recipe.locked}
                      onChange={(event) =>
                        updateRecipe(recipe.id, { locked: event.target.checked })
                      }
                      style={{ width: 22, height: 22, borderRadius: 6, accentColor: '#0f172a' }}
                    />
                    Manual lock
                  </label>
                </div>
              </div>

              <div className="grid-2" style={{ gap: 32 }}>
                <label style={labelStyle}>
                  Beat 1 templates (one per line)
                  <textarea
                    style={textareaStyle}
                    value={recipe.beat1Templates.join("\n")}
                    onChange={(event) =>
                      updateRecipe(recipe.id, {
                        beat1Templates: event.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                      })
                    }
                  />
                </label>
                <label style={labelStyle}>
                  Beat 2 templates (one per line)
                  <textarea
                    style={textareaStyle}
                    value={recipe.beat2Templates.join("\n")}
                    onChange={(event) =>
                      updateRecipe(recipe.id, {
                        beat2Templates: event.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                      })
                    }
                  />
                </label>
              </div>

              <div className="grid-3" style={{ gap: 32 }}>
                <label style={labelStyle}>
                  CTA type
                  <select
                    style={inputStyle}
                    value={recipe.ctaType}
                    onChange={(event) =>
                      updateRecipe(recipe.id, { ctaType: event.target.value })
                    }
                  >
                    {CTA_OPTIONS.map((cta) => (
                      <option key={cta} value={cta}>
                        {CTA_LABELS[cta] ?? cta}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Allowed snippet types
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {snippetTypes.map((type) => (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: '#334155', fontWeight: 500, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={recipe.allowedSnippetTypes.includes(type)}
                          onChange={(event) =>
                            updateRecipe(recipe.id, {
                              allowedSnippetTypes: event.target.checked
                                ? [...recipe.allowedSnippetTypes, type]
                                : recipe.allowedSnippetTypes.filter((item) => item !== type)
                            })
                          }
                          style={{ width: 20, height: 20, borderRadius: 4, accentColor: '#fe2c55' }}
                        />
                        {snippetTypeLabels[type] ?? type}
                      </label>
                    ))}
                  </div>
                </label>

                <label style={labelStyle}>
                  Disallowed containers
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {containers.map((container) => (
                      <label key={container} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: '#334155', fontWeight: 500, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={recipe.disallowedContainers.includes(container)}
                          onChange={(event) =>
                            updateRecipe(recipe.id, {
                              disallowedContainers: event.target.checked
                                ? [...recipe.disallowedContainers, container]
                                : recipe.disallowedContainers.filter((item) => item !== container)
                            })
                          }
                          style={{ width: 20, height: 20, borderRadius: 4, accentColor: '#fe2c55' }}
                        />
                        {container}
                      </label>
                    ))}
                  </div>
                </label>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Variants (AI-managed)
                </div>
                {(recipe.variants ?? []).length === 0 ? (
                  <div style={{ fontSize: 14, color: "#94a3b8" }}>No variants yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {(recipe.variants ?? []).map((variant) => (
                      <div key={variant.id} style={{ padding: 16, borderRadius: 16, border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{variant.beat1}</div>
                          <div style={{ fontSize: 13, color: "#64748b" }}>{variant.beat2}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{variant.status}</div>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={variant.locked}
                            onChange={(event) =>
                              updateRecipe(recipe.id, {
                                variants: (recipe.variants ?? []).map((item) =>
                                  item.id === variant.id ? { ...item, locked: event.target.checked } : item
                                )
                              })
                            }
                            style={{ width: 20, height: 20, borderRadius: 6, accentColor: "#0f172a" }}
                          />
                          Manual lock
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
