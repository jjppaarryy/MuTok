type RulesSettings = {
  cadence_per_day: number;
  target_queue_size: number;
  allowed_containers: string[];
  montage: {
    clip_count: number;
    clip_duration_range: [number, number];
  };
  text_overlay: {
    max_lines: number;
  };
  guardrails: {
    max_lines: number;
    banned_words: string[];
    banned_phrases: string[];
    allowed_tones: string[];
    max_novelty: number;
    allow_sync_critical: boolean;
    allow_hands_keys_literal: boolean;
  };
  explore_ratio: number;
  min_compatibility_score: number;
  snippet_duration_range: [number, number];
  post_time_windows: [string, string];
  caption_marker_enabled: boolean;
  caption_marker_prefix: string;
  metrics_match_window_minutes: number;
  caption_topic_keywords: string[];
  caption_hashtags: string[];
};

type RulesFormProps = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

const inputStyle: React.CSSProperties = {
  marginTop: 12,
  width: '100%',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  padding: '16px 20px',
  fontSize: 16,
  fontWeight: 500,
  color: '#0f172a',
  outline: 'none',
  transition: 'all 0.2s'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

export default function RulesForm({ rules, onChange }: RulesFormProps) {
  return (
    <div style={{ padding: 48, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 32 }} className="panel">
      <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Rules Configuration</h2>

      <label style={labelStyle}>
        Cadence per day
        <input
          type="number"
          min={1}
          value={rules.cadence_per_day}
          onChange={(event) => onChange("cadence_per_day", Number(event.target.value))}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Target queue size
        <input
          type="number"
          min={1}
          value={rules.target_queue_size}
          onChange={(event) => onChange("target_queue_size", Number(event.target.value))}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Explore ratio
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={rules.explore_ratio}
          onChange={(event) => onChange("explore_ratio", Number(event.target.value))}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Min compatibility score
        <input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={rules.min_compatibility_score}
          onChange={(event) => onChange("min_compatibility_score", Number(event.target.value))}
          style={inputStyle}
        />
      </label>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          Clip count
          <input
            type="number"
            min={1}
            value={rules.montage.clip_count}
            onChange={(event) =>
              onChange("montage", {
                ...rules.montage,
                clip_count: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>

        <label style={{ ...labelStyle, flex: 2 }}>
          Clip duration range (sec)
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="number"
              min={0.2}
              step={0.1}
              value={rules.montage.clip_duration_range[0]}
              onChange={(event) =>
                onChange("montage", {
                  ...rules.montage,
                  clip_duration_range: [
                    Number(event.target.value),
                    rules.montage.clip_duration_range[1]
                  ]
                })
              }
              style={inputStyle}
            />
            <input
              type="number"
              min={0.2}
              step={0.1}
              value={rules.montage.clip_duration_range[1]}
              onChange={(event) =>
                onChange("montage", {
                  ...rules.montage,
                  clip_duration_range: [
                    rules.montage.clip_duration_range[0],
                    Number(event.target.value)
                  ]
                })
              }
              style={inputStyle}
            />
          </div>
        </label>
      </div>

      <label style={labelStyle}>
        Post time windows
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="time"
            value={rules.post_time_windows[0]}
            onChange={(event) =>
              onChange("post_time_windows", [event.target.value, rules.post_time_windows[1]])
            }
            style={inputStyle}
          />
          <input
            type="time"
            value={rules.post_time_windows[1]}
            onChange={(event) =>
              onChange("post_time_windows", [rules.post_time_windows[0], event.target.value])
            }
            style={inputStyle}
          />
        </div>
      </label>

      <div style={{ padding: '24px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rules.caption_marker_enabled}
            onChange={(event) => onChange("caption_marker_enabled", event.target.checked)}
            style={{ width: 24, height: 24, borderRadius: 6, accentColor: '#fe2c55' }}
          />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Enable caption marker</span>
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

      <div style={{ paddingTop: 24, borderTop: "1px solid #f1f5f9" }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
          Guardrails
        </h3>
        <label style={labelStyle}>
          Max text lines
          <input
            type="number"
            min={1}
            value={rules.guardrails.max_lines}
            onChange={(event) =>
              onChange("guardrails", {
                ...rules.guardrails,
                max_lines: Number(event.target.value)
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Banned phrases (one per line)
          <textarea
            style={{ ...inputStyle, minHeight: 120, lineHeight: 1.5 }}
            value={rules.guardrails.banned_phrases.join("\n")}
            onChange={(event) =>
              onChange("guardrails", {
                ...rules.guardrails,
                banned_phrases: event.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
              })
            }
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rules.guardrails.allow_sync_critical}
            onChange={(event) =>
              onChange("guardrails", {
                ...rules.guardrails,
                allow_sync_critical: event.target.checked
              })
            }
            style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
          />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
            Allow sync-critical clips
          </span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rules.guardrails.allow_hands_keys_literal}
            onChange={(event) =>
              onChange("guardrails", {
                ...rules.guardrails,
                allow_hands_keys_literal: event.target.checked
              })
            }
            style={{ width: 24, height: 24, borderRadius: 6, accentColor: "#fe2c55" }}
          />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
            Allow hands/keys literal clips
          </span>
        </label>
      </div>
    </div>
  );
}
