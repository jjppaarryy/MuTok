import { useMemo } from "react";
import TrackWaveform from "./TrackWaveform";
import SnippetList from "./SnippetList";

type Snippet = {
  id: string;
  startSec: number;
  durationSec: number;
  energyScore: number;
  energy?: number | null;
  section?: string | null;
  vibe?: string | null;
  approved: boolean;
  moment3to7?: boolean;
  moment7to11?: boolean;
};

type Track = {
  id: string;
  filePath: string;
  title: string;
  bpm?: number | null;
  key?: string | null;
  durationSec?: number | null;
  snippets: Snippet[];
};

type TrackCardProps = {
  track: Track;
  onAddSnippet: (trackId: string, startSec: number, durationSec: number) => Promise<void>;
  onDeleteSnippet: (snippetId: string) => Promise<void>;
  onUpdateSnippet: (snippetId: string, updates: Partial<Snippet>) => Promise<void>;
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function TrackCard({
  track,
  onAddSnippet,
  onDeleteSnippet,
  onUpdateSnippet
}: TrackCardProps) {
  const meta = useMemo(() => {
    if (track.durationSec) {
      return `Length ${formatTime(track.durationSec)}`;
    }
    return "Length —";
  }, [track.durationSec]);

  return (
    <div className="card dashboard-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginTop: 10
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>{track.title}</div>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            backgroundColor: "#f1f5f9",
            color: "#475569",
            fontSize: 12,
            fontWeight: 700
          }}
        >
          {meta}
        </div>
      </div>
      <div
        style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, marginBottom: 12 }}
        className="truncate"
      >
        {track.filePath}
      </div>

      <TrackWaveform trackId={track.id} onAddSnippet={onAddSnippet} />

      <div className="mt-16 pt-10">
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
          Snippets
        </div>
        <SnippetList
          trackId={track.id}
          snippets={track.snippets}
          onDeleteSnippet={onDeleteSnippet}
          onUpdateSnippet={onUpdateSnippet}
        />
      </div>
    </div>
  );
}
