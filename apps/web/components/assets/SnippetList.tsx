import { useRef } from "react";
import { Trash2 } from "lucide-react";
import ActionButton from "../ActionButton";
import InlineTip from "../InlineTip";

type Snippet = {
  id: string;
  startSec: number;
  durationSec: number;
  energyScore: number;
  section?: string | null;
};

type SnippetListProps = {
  trackId: string;
  snippets: Snippet[];
  onDeleteSnippet: (snippetId: string) => Promise<void>;
  onUpdateSnippet: (snippetId: string, updates: Partial<Snippet>) => Promise<void>;
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const selectStyle: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  padding: "8px 10px",
  fontSize: 13,
  color: "#0f172a"
};

export default function SnippetList({
  trackId,
  snippets,
  onDeleteSnippet,
  onUpdateSnippet
}: SnippetListProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const playSnippet = (start: number, duration: number) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(`/api/assets/track/${trackId}/file`);
    }
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = Math.max(0, start);
    audio.play().catch(() => undefined);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => {
      audio.pause();
    }, Math.max(0.2, duration) * 1000);
  };

  if (snippets.length === 0) {
    return (
      <div className="text-base text-slate-500">No snippets yet. Save a selection to add one.</div>
    );
  }

  return (
    <div
      className="mt-3"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16
      }}
    >
      {snippets.map((snippet) => (
        <div
          key={snippet.id}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "16px 20px",
            borderRadius: 18,
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {formatTime(snippet.startSec)}–{formatTime(snippet.startSec + snippet.durationSec)}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              Length {snippet.durationSec.toFixed(1)}s · Auto energy {snippet.energyScore}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>Section</span>
                <InlineTip text="Where does this sit in the song?" />
                <select
                  style={selectStyle}
                  value={snippet.section ?? "unset"}
                  onChange={(event) =>
                    onUpdateSnippet(snippet.id, {
                      section: event.target.value === "unset" ? null : event.target.value
                    })
                  }
                >
                  <option value="unset">Unset</option>
                  <option value="calm">Calm (no drums)</option>
                  <option value="build">Build (rising)</option>
                  <option value="peak">Peak (drums)</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <ActionButton
              label="Play"
              variant="secondary"
              onClick={() => playSnippet(Number(snippet.startSec), Number(snippet.durationSec))}
            />
            <button
              onClick={() => onDeleteSnippet(snippet.id)}
              title="Delete snippet"
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
                cursor: "pointer",
                marginLeft: 12
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
