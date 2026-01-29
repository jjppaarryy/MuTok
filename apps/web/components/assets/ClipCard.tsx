import { Trash2 } from "lucide-react";
import InlineTip from "../InlineTip";

type Clip = {
  id: string;
  filePath: string;
  category: string;
  energy: number;
  motion: string;
  sync: string;
  vibe: string;
};

const categories = [
  "DAW_screen",
  "Studio_portrait",
  "Hands_knobs_faders",
  "Hands_keys_abstract",
  "Hands_keys_literal",
  "Lifestyle_broll",
  "Abstract_visual",
  "Text_background",
  "DJing",
  "Crowd_stage"
];

const motions = ["low", "med", "high"];
const syncs = ["safe", "sensitive", "critical"];
const vibes = ["bright_clean", "dark_moody", "neon_club", "warm_home"];

type ClipCardProps = {
  clip: Clip;
  onUpdate: (id: string, updates: Partial<Clip>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  compact?: boolean;
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  padding: "10px 12px",
  fontSize: 14,
  color: "#0f172a",
  outline: "none"
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: 0.6
};

const fileName = (filePath: string) => {
  const parts = filePath.split("/");
  return parts[parts.length - 1] ?? filePath;
};

export default function ClipCard({ clip, onUpdate, onDelete, compact }: ClipCardProps) {
  const previewSize = compact ? { width: 150, height: 268 } : { width: 170, height: 302 };
  return (
    <div className="card dashboard-card" style={{ display: "grid", gap: compact ? 16 : 24 }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <video
          src={`/api/assets/clip/${clip.id}/file`}
          muted
          playsInline
          controls
          preload="metadata"
          style={{
            width: previewSize.width,
            height: previewSize.height,
            borderRadius: 16,
            backgroundColor: "#0f172a",
            objectFit: "cover"
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div className="text-sm text-slate-500" style={{ marginBottom: 8 }}>
              {fileName(clip.filePath)}
            </div>
            <button
              onClick={() => onDelete(clip.id)}
              title="Delete this clip"
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                borderRadius: 10,
                width: 34,
                height: 34,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                cursor: "pointer"
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          maxWidth: compact ? 520 : 620
        }}
      >
        <label style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={labelStyle}>Category</span>
            <InlineTip text="What kind of visual is this? Pick the closest match." />
          </div>
          <select
            style={fieldStyle}
            value={clip.category}
            onChange={(event) => onUpdate(clip.id, { category: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={labelStyle}>Energy</span>
            <InlineTip text="How intense does this clip feel? 1 = calm, 5 = peak." />
          </div>
          <input
            type="number"
            min={1}
            max={5}
            value={clip.energy}
            onChange={(event) => onUpdate(clip.id, { energy: Number(event.target.value) })}
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={labelStyle}>Motion</span>
            <InlineTip text="How much movement is in the clip? low / med / high." />
          </div>
          <select
            style={fieldStyle}
            value={clip.motion}
            onChange={(event) => onUpdate(clip.id, { motion: event.target.value })}
          >
            {motions.map((motion) => (
              <option key={motion} value={motion}>
                {motion}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={labelStyle}>Sync</span>
            <InlineTip text="How risky is audio/visual mismatch? critical = keep paired." />
          </div>
          <select
            style={fieldStyle}
            value={clip.sync}
            onChange={(event) => onUpdate(clip.id, { sync: event.target.value })}
          >
            {syncs.map((sync) => (
              <option key={sync} value={sync}>
                {sync}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 8, gridColumn: "span 2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={labelStyle}>Vibe</span>
            <InlineTip text="Overall feel of the clip (color/mood/setting)." />
          </div>
          <select
            style={fieldStyle}
            value={clip.vibe}
            onChange={(event) => onUpdate(clip.id, { vibe: event.target.value })}
          >
            {vibes.map((vibe) => (
              <option key={vibe} value={vibe}>
                {vibe}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
