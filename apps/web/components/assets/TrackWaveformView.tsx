import ActionButton from "../ActionButton";

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

type Selection = { start: number; end: number } | null;

export type TrackWaveformViewProps = {
  waveformRef: React.RefObject<HTMLDivElement>;
  waveKey: number;
  selection: Selection;
  selectionDuration: number | null;
  loadingWave: boolean;
  playheadRatio: number | null;
  isPlaying: boolean;
  regionCount: number;
  saveMessage: string | null;
  saveError: string | null;
  onPlaySelection: () => void;
  onSaveSnippet: () => void;
  onClearSelection: () => void;
};

export default function TrackWaveformView({
  waveformRef,
  waveKey,
  selection,
  selectionDuration,
  loadingWave,
  playheadRatio,
  isPlaying,
  regionCount,
  saveMessage,
  saveError,
  onPlaySelection,
  onSaveSnippet,
  onClearSelection
}: TrackWaveformViewProps) {
  return (
    <div className="mt-8 rounded-2xl bg-white px-5 py-5" style={{ position: "relative" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Manual snippet picker</div>
      <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
        Drag across the wave to pick a section, then save it.
      </div>
      <div className="mt-4" style={{ position: "relative" }}>
        <div
          key={waveKey}
          ref={waveformRef}
          style={{
            height: 128,
            borderRadius: 12,
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            position: "relative",
            zIndex: 1,
            overflow: "hidden",
            pointerEvents: "auto"
          }}
        />
        {playheadRatio != null ? (
          <div
            style={{
              position: "absolute",
              top: 8,
              bottom: 8,
              left: `${playheadRatio * 100}%`,
              width: 2,
              backgroundColor: "#94a3b8",
              borderRadius: 2,
              transform: "translateX(-1px)",
              zIndex: 2,
              pointerEvents: "none"
            }}
          />
        ) : null}
        {selectionDuration != null ? (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              padding: "6px 10px",
              borderRadius: 999,
              backgroundColor: "#0f172a",
              color: "#f8fafc",
              fontSize: 12,
              fontWeight: 700
            }}
          >
            {selectionDuration.toFixed(1)}s
          </div>
        ) : null}
        {loadingWave ? <div className="mt-3 text-sm text-slate-500">Loading waveform…</div> : null}
      </div>
      <div
        className="mt-4 flex flex-wrap items-center gap-3"
        style={{ position: "relative", zIndex: 2, fontSize: 13, color: "#64748b" }}
      >
        <span>
          {selection
            ? `Selected ${formatTime(selection.start)}–${formatTime(selection.end)} (${Math.max(
                0,
                selection.end - selection.start
              ).toFixed(1)}s)`
            : "Drag across the wave to pick a moment."}
        </span>
      </div>
      <div
        style={{
          marginTop: 16,
          marginBottom: 24,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          position: "relative",
          zIndex: 2,
          pointerEvents: "auto"
        }}
      >
        <ActionButton
          label={isPlaying ? "Pause" : "Play selection"}
          variant="outline"
          onClick={onPlaySelection}
        />
        <ActionButton label="Save snippet" onClick={onSaveSnippet} />
        <ActionButton
          label="Clear"
          variant="ghost"
          onClick={onClearSelection}
          disabled={regionCount === 0}
        />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>
        {(() => {
          if (!selection) return "No selection detected.";
          const start = Number(selection.start);
          const end = Number(selection.end);
          if (!Number.isFinite(start) || !Number.isFinite(end)) return "Selection detected.";
          return `Selection: ${formatTime(start)}–${formatTime(end)}`;
        })()}
      </div>
      {saveMessage || saveError ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: saveError ? "#be123c" : "#059669"
          }}
        >
          {saveError ?? saveMessage}
        </div>
      ) : null}
    </div>
  );
}
