import { useEffect, useRef, useState } from "react";
import ActionButton from "../ActionButton";

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

type TrackWaveformProps = {
  trackId: string;
  onAddSnippet: (trackId: string, startSec: number, durationSec: number) => Promise<void>;
};

export default function TrackWaveform({ trackId, onAddSnippet }: TrackWaveformProps) {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [selectionDuration, setSelectionDuration] = useState<number | null>(null);
  const [loadingWave, setLoadingWave] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [regionCount, setRegionCount] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingPlay, setPendingPlay] = useState<{ start: number; end: number } | null>(null);
  const [playheadRatio, setPlayheadRatio] = useState<number | null>(null);
  const [waveKey, setWaveKey] = useState<number>(0);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const regionsRef = useRef<any>(null);
  const waveRef = useRef<any>(null);
  const activeRegionRef = useRef<any>(null);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let wave: any;
    let mounted = true;

    const setup = async () => {
      if (!waveformRef.current) return;
      if (waveRef.current) {
        waveRef.current.destroy?.();
        waveRef.current = null;
      }
      waveformRef.current.innerHTML = "";
      const WaveSurfer = (await import("wavesurfer.js")).default;
      const RegionsPluginModule = await import("wavesurfer.js/dist/plugins/regions.esm.js");
      const RegionsPlugin = (RegionsPluginModule as any).default ?? RegionsPluginModule;

      wave = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#e2e8f0",
        progressColor: "#94a3b8",
        cursorColor: "transparent",
        cursorWidth: 0,
        interact: true,
        autoCenter: false,
        height: 120,
        barWidth: 2,
        barGap: 1,
        barHeight: 0.9,
        barAlign: "bottom",
        splitChannels: false,
        normalize: true,
        url: `/api/assets/track/${trackId}/file`
      });

      waveRef.current = wave;
      const regions = RegionsPlugin?.create
        ? wave.registerPlugin(RegionsPlugin.create({ maxRegions: 1 }))
        : null;
      if (!regions) {
        if (mounted) setLoadingWave(false);
        return;
      }
      regionsRef.current = regions;
      regions.enableDragSelection({ color: "rgba(254, 44, 85, 0.18)" });

      wave.on("ready", () => {
        if (mounted) setLoadingWave(false);
        if (pendingPlay) {
          const start = pendingPlay.start;
          const end = pendingPlay.end;
          wave.setTime(start);
          wave.play();
          stopTimerRef.current = window.setTimeout(() => {
            wave.pause?.();
          }, Math.max(0.2, end - start) * 1000);
          setPendingPlay(null);
        }
      });
      wave.on("error", () => {
        if (mounted) setLoadingWave(false);
      });

      const updateRegionCount = () => {
        const count =
          (regions.getRegions?.()?.length ?? Object.keys(regions.regions ?? {}).length) || 0;
        setRegionCount(count);
      };

      const onRegionCreated = (region: any) => {
        const regionsList = regions.getRegions?.() ?? Object.values(regions.regions ?? {});
        for (const existing of regionsList) {
          if (existing.id !== region.id) {
            existing.remove();
          }
        }
        activeRegionRef.current = region;
        setSelection({ start: region.start, end: region.end });
        setSelectionDuration(Math.max(0, region.end - region.start));
        updateRegionCount();
        regionsRef.current?.disableDragSelection?.();
      };
      const onRegionUpdated = (region: any) => {
        activeRegionRef.current = region;
        setSelection({ start: region.start, end: region.end });
        setSelectionDuration(Math.max(0, region.end - region.start));
        updateRegionCount();
      };
      const onRegionClicked = (region: any) => {
        activeRegionRef.current = region;
        setSelection({ start: region.start, end: region.end });
        setSelectionDuration(Math.max(0, region.end - region.start));
      };
      const onRegionRemoved = () => {
        setSelection(null);
        activeRegionRef.current = null;
        setSelectionDuration(null);
        updateRegionCount();
        regionsRef.current?.enableDragSelection?.({ color: "rgba(254, 44, 85, 0.18)" });
      };

      if (regions.on) {
        regions.on("region-created", onRegionCreated);
        regions.on("region-updated", onRegionUpdated);
        regions.on("region-clicked", onRegionClicked);
        regions.on("region-removed", onRegionRemoved);
      } else {
        wave.on("region-created", onRegionCreated);
        wave.on("region-updated", onRegionUpdated);
        wave.on("region-clicked", onRegionClicked);
        wave.on("region-removed", onRegionRemoved);
      }
      wave.on("play", () => setIsPlaying(true));
      wave.on("pause", () => setIsPlaying(false));
      wave.on("finish", () => setIsPlaying(false));
      wave.on("audioprocess", (time: number) => {
        const duration = wave.getDuration?.() ?? 0;
        if (duration > 0) {
          setPlayheadRatio(Math.min(1, Math.max(0, time / duration)));
        }
      });
      wave.on("seek", (progress: number) => {
        setPlayheadRatio(Math.min(1, Math.max(0, progress)));
      });
    };

    setLoadingWave(true);
    void setup();
    return () => {
      mounted = false;
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      if (wave) wave.destroy();
      if (waveformRef.current) {
        waveformRef.current.innerHTML = "";
      }
      setPlayheadRatio(null);
    };
  }, [trackId, waveKey]);

  const getRegionsList = () => {
    const regionsApi = regionsRef.current;
    if (!regionsApi) return [];
    if (regionsApi.getRegions) return regionsApi.getRegions();
    if (regionsApi.regions) return Object.values(regionsApi.regions);
    return [];
  };

  const playRange = (start: number, end: number) => {
    if (!waveRef.current) return;
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
    }
    waveRef.current.pause?.();
    const isReady = waveRef.current.isReady?.() ?? true;
    if (!isReady) {
      setPendingPlay({ start, end });
      return;
    }
    waveRef.current.setTime(start);
    waveRef.current.seekTo?.(start / Math.max(1, waveRef.current.getDuration?.() ?? 1));
    waveRef.current.play();
    stopTimerRef.current = window.setTimeout(() => {
      waveRef.current?.pause?.();
    }, Math.max(0.2, end - start) * 1000);
  };

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
          onClick={() => {
            const regions = getRegionsList();
            const region = regions[0] ?? activeRegionRef.current ?? selection;
            if (!region || !waveRef.current) {
              waveRef.current?.playPause?.();
              return;
            }
            const start = Number(region.start);
            const end = Number(region.end);
            if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
            playRange(start, end);
          }}
        />
        <ActionButton
          label="Save snippet"
          onClick={async () => {
            setSaveMessage(null);
            setSaveError(null);
            const regions = getRegionsList();
            const region = regions[0] ?? activeRegionRef.current ?? selection;
            if (!region) {
              setSaveError(
                `Select a section first. (regions=${regions.length}, selection=${selection ? "yes" : "no"})`
              );
              return;
            }
            const start = Number(region.start);
            const end = Number(region.end);
            if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
            const duration = Math.max(1, end - start);
            try {
              await onAddSnippet(trackId, start, duration);
              regionsRef.current?.clearRegions?.();
              setSelection(null);
              setRegionCount(0);
              activeRegionRef.current = null;
              setSelectionDuration(null);
              setSaveMessage("Snippet saved.");
            } catch (error) {
              setSaveError(error instanceof Error ? error.message : "Save failed.");
            }
          }}
        />
        <ActionButton
          label="Clear"
          variant="ghost"
          onClick={() => {
            const regions = getRegionsList();
            regions.forEach((region) => region.remove?.());
            regionsRef.current?.clearRegions?.();
            setSelection(null);
            setRegionCount(0);
            activeRegionRef.current = null;
            setSelectionDuration(null);
            setPlayheadRatio(null);
            setSaveMessage(null);
            setSaveError(null);
            setWaveKey((prev) => prev + 1);
          }}
          disabled={regionCount === 0}
        />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>
        {(() => {
          const regions = getRegionsList();
          const region = regions[0] ?? activeRegionRef.current ?? selection;
          if (!region) return "No selection detected.";
          const start = Number(region.start);
          const end = Number(region.end);
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
