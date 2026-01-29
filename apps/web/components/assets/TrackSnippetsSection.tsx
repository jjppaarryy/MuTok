import { useMemo, useState } from "react";
import ActionButton from "../ActionButton";
import TrackCard from "./TrackCard";

type Snippet = {
  id: string;
  startSec: number;
  durationSec: number;
  energyScore: number;
  energy?: number | null;
  section?: string | null;
  vibe?: string | null;
  approved: boolean;
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

type TrackSnippetsSectionProps = {
  tracks: Track[];
  onAddSnippet: (trackId: string, startSec: number, durationSec: number) => Promise<void>;
  onDeleteSnippet: (snippetId: string) => Promise<void>;
  onUpdateSnippet: (snippetId: string, updates: Partial<Snippet>) => Promise<void>;
};

export default function TrackSnippetsSection({
  tracks,
  onAddSnippet,
  onDeleteSnippet,
  onUpdateSnippet
}: TrackSnippetsSectionProps) {
  const [trackPage, setTrackPage] = useState<number>(1);

  const tracksPerPage = 1;
  const trackTotalPages = Math.max(1, Math.ceil(tracks.length / tracksPerPage));
  const trackPageSafe = Math.min(trackPage, trackTotalPages);
  const pagedTracks = useMemo(
    () => tracks.slice((trackPageSafe - 1) * tracksPerPage, trackPageSafe * tracksPerPage),
    [tracks, trackPageSafe]
  );

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>
        Track Snippets
      </h2>
      {tracks.length === 0 ? (
        <div style={{ textAlign: "center", color: "#64748b" }} className="card dashboard-card">
          No tracks uploaded yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {pagedTracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onAddSnippet={onAddSnippet}
              onDeleteSnippet={onDeleteSnippet}
              onUpdateSnippet={onUpdateSnippet}
            />
          ))}
          {tracks.length > tracksPerPage ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
              <ActionButton
                label="Previous"
                variant="ghost"
                onClick={() => setTrackPage((prev) => Math.max(1, prev - 1))}
                disabled={trackPageSafe <= 1}
              />
              <div style={{ fontSize: 14, color: "#64748b" }}>
                Page {trackPageSafe} of {trackTotalPages}
              </div>
              <ActionButton
                label="Next"
                variant="ghost"
                onClick={() => setTrackPage((prev) => Math.min(trackTotalPages, prev + 1))}
                disabled={trackPageSafe >= trackTotalPages}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
