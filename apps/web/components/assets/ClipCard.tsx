import { Trash2 } from "lucide-react";
import InlineTip from "../InlineTip";
import { clipMomentLabels, clipMoments, normalizeClipCategory } from "../../lib/clipCategories";

type Clip = {
  id: string;
  filePath: string;
  category: string;
  sync: string;
  clipSetItems?: {
    clipSetId: string;
    clipSet: {
      id: string;
      name: string;
    };
  }[];
};

const syncs = ["safe", "sensitive", "critical"];
type ClipSet = { id: string; name: string };

type ClipCardProps = {
  clip: Clip;
  clipSets: ClipSet[];
  onUpdate: (id: string, updates: Partial<Clip> & { clipSetIds?: string[] }) => Promise<void>;
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

export default function ClipCard({ clip, clipSets, onUpdate, onDelete, compact }: ClipCardProps) {
  const previewSize = compact ? { width: 150, height: 268 } : { width: 170, height: 302 };
  const selectedClipSetIds = new Set(
    (clip.clipSetItems ?? []).map((item) => item.clipSetId)
  );
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
            <span style={labelStyle}>Moment</span>
            <InlineTip text="How this visual feels vs the music moment." />
          </div>
          <select
            style={fieldStyle}
            value={normalizeClipCategory(clip.category)}
            onChange={(event) => onUpdate(clip.id, { category: event.target.value })}
          >
            {clipMoments.map((category) => (
              <option key={category} value={category}>
                {clipMomentLabels[category]}
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
            <span style={labelStyle}>Clip Sets</span>
            <InlineTip text="Pick sets this clip belongs to (keep consistent outfits/lighting)." />
          </div>
          <select
            style={fieldStyle}
            multiple
            size={Math.min(4, Math.max(2, clipSets.length || 2))}
            value={[...selectedClipSetIds]}
            onChange={(event) => {
              const selected = Array.from(event.currentTarget.selectedOptions).map(
                (option) => option.value
              );
              onUpdate(clip.id, { clipSetIds: selected });
            }}
          >
            {clipSets.length === 0 ? (
              <option value="" disabled>
                No clip sets yet
              </option>
            ) : null}
            {clipSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
