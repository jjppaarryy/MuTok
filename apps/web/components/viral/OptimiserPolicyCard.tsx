type OptimiserPolicy = {
  exploration_budget: number;
  media_exploration_budget: number;
  min_views_before_counting: number;
  min_pulls_before_promote: number;
  min_pulls_before_retire: number;
  media_min_pulls_before_exploit: number;
  max_locked_share: number;
  prior_mean: number;
  prior_weight: number;
  autopilot_enabled: boolean;
  autopilot_interval_hours: number;
  plateau_days: number;
  test_dimensions: {
    recipe: boolean;
    variant: boolean;
    cta: boolean;
    container: boolean;
    beat_timing: boolean;
    timestamp_lure: boolean;
  };
  promotion: {
    min_impressions: number;
    uplift: number;
  };
  retirement: {
    max_underperform: number;
  };
};

const cardStyle: React.CSSProperties = { padding: 48, borderRadius: 24, backgroundColor: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", gap: 32 };
const inputStyle: React.CSSProperties = { marginTop: 12, width: "100%", borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", padding: "16px 20px", fontSize: 16, fontWeight: 500, color: "#0f172a", outline: "none" };
const labelStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, fontSize: 16, fontWeight: 600, color: "#334155", cursor: "pointer" };

type OptimiserPolicyCardProps = {
  policy: OptimiserPolicy;
  onUpdate: (updates: Partial<OptimiserPolicy>) => void;
};

export default function OptimiserPolicyCard({ policy, onUpdate }: OptimiserPolicyCardProps) {
  return (
    <section style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Optimiser policy
      </div>
      <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Exploration budget
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={policy.exploration_budget}
          onChange={(event) =>
            onUpdate({ exploration_budget: Number(event.target.value) })
          }
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Media exploration budget (clips/snippets)
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={policy.media_exploration_budget}
          onChange={(event) =>
            onUpdate({ media_exploration_budget: Number(event.target.value) })
          }
          style={inputStyle}
        />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Min views before counting
          <input
            type="number"
            min={0}
            value={policy.min_views_before_counting}
            onChange={(event) =>
              onUpdate({ min_views_before_counting: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Min pulls before exploit (clips/snippets)
          <input
            type="number"
            min={0}
            step={1}
            value={policy.media_min_pulls_before_exploit}
            onChange={(event) =>
              onUpdate({ media_min_pulls_before_exploit: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Max locked share
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={policy.max_locked_share}
            onChange={(event) =>
              onUpdate({ max_locked_share: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Allowed dimensions to test
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {Object.entries(policy.test_dimensions).map(([key, value]) => (
            <label key={key} style={labelStyle}>
              <input
                type="checkbox"
                checked={value}
                onChange={(event) =>
                  onUpdate({
                    test_dimensions: {
                      ...policy.test_dimensions,
                      [key]: event.target.checked
                    }
                  })
                }
                style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
              />
              {key.replace("_", " ")}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Prior mean
          <input
            type="number"
            min={0}
            step={0.1}
            value={policy.prior_mean}
            onChange={(event) =>
              onUpdate({ prior_mean: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Prior weight
          <input
            type="number"
            min={0}
            step={1}
            value={policy.prior_weight}
            onChange={(event) =>
              onUpdate({ prior_weight: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Autopilot enabled
          <input
            type="checkbox"
            checked={policy.autopilot_enabled}
            onChange={(event) => onUpdate({ autopilot_enabled: event.target.checked })}
            style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#0f172a" }}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Autopilot interval (hours)
          <input
            type="number"
            min={1}
            step={1}
            value={policy.autopilot_interval_hours}
            onChange={(event) =>
              onUpdate({ autopilot_interval_hours: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Promotion min impressions
          <input
            type="number"
            min={0}
            value={policy.promotion.min_impressions}
            onChange={(event) =>
              onUpdate({
                promotion: {
                  ...policy.promotion,
                  min_impressions: Number(event.target.value)
                }
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Min pulls before promote
          <input
            type="number"
            min={0}
            value={policy.min_pulls_before_promote}
            onChange={(event) =>
              onUpdate({ min_pulls_before_promote: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Promotion uplift target
          <input
            type="number"
            min={0}
            step={0.05}
            value={policy.promotion.uplift}
            onChange={(event) =>
              onUpdate({
                promotion: {
                  ...policy.promotion,
                  uplift: Number(event.target.value)
                }
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Min pulls before retire
          <input
            type="number"
            min={0}
            value={policy.min_pulls_before_retire}
            onChange={(event) =>
              onUpdate({ min_pulls_before_retire: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Retirement underperform count
          <input
            type="number"
            min={0}
            value={policy.retirement.max_underperform}
            onChange={(event) =>
              onUpdate({
                retirement: {
                  ...policy.retirement,
                  max_underperform: Number(event.target.value)
                }
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ ...labelStyle, flexDirection: "column", alignItems: "flex-start" }}>
          Plateau days
          <input
            type="number"
            min={0}
            value={policy.plateau_days}
            onChange={(event) =>
              onUpdate({ plateau_days: Number(event.target.value) })
            }
            style={inputStyle}
          />
        </label>
      </div>
    </section>
  );
}
