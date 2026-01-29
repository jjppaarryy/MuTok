import { useEffect, useRef, useState } from "react";
import TrackWaveformView from "./TrackWaveformView";

type TrackWaveformProps = {
  trackId: string;
  onAddSnippet: (trackId: string, startSec: number, durationSec: number) => Promise<void>;
};

type WaveRegion = {
  id?: string;
  start: number;
  end: number;
  remove?: () => void;
};

type RegionsApi = {
  enableDragSelection?: (options: { color: string }) => void;
  disableDragSelection?: () => void;
  clearRegions?: () => void;
  getRegions?: () => WaveRegion[];
  regions?: Record<string, WaveRegion>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type WaveSurferInstance = {
  destroy?: () => void;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  play?: () => void;
  pause?: () => void;
  playPause?: () => void;
  setTime?: (time: number) => void;
  seekTo?: (progress: number) => void;
  getDuration?: () => number;
  isReady?: () => boolean;
  registerPlugin?: (plugin: unknown) => RegionsApi | null;
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
  const regionsRef = useRef<RegionsApi | null>(null);
  const waveRef = useRef<WaveSurferInstance | null>(null);
  const activeRegionRef = useRef<WaveRegion | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let waveInstance: WaveSurferInstance | null = null;
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
      type RegionsPluginFactory = { create?: (options?: Record<string, unknown>) => unknown };
      const RegionsPlugin =
        (RegionsPluginModule as { default?: RegionsPluginFactory }).default ??
        (RegionsPluginModule as RegionsPluginFactory);

      const wave = WaveSurfer.create({
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
        normalize: true,
        url: `/api/assets/track/${trackId}/file`
      }) as unknown as WaveSurferInstance;

      waveInstance = wave;
      waveRef.current = wave;
      const regions = RegionsPlugin?.create
        ? wave.registerPlugin?.(RegionsPlugin.create({ maxRegions: 1 }))
        : null;
      if (!regions) {
        if (mounted) setLoadingWave(false);
        return;
      }
      regionsRef.current = regions;
      regions.enableDragSelection?.({ color: "rgba(254, 44, 85, 0.18)" });

      wave.on?.("ready", () => {
        if (mounted) setLoadingWave(false);
        if (pendingPlay) {
          const start = pendingPlay.start;
          const end = pendingPlay.end;
          wave.setTime?.(start);
          wave.play?.();
          stopTimerRef.current = window.setTimeout(() => {
            wave.pause?.();
          }, Math.max(0.2, end - start) * 1000);
          setPendingPlay(null);
        }
      });
      wave.on?.("error", () => {
        if (mounted) setLoadingWave(false);
      });

      const updateRegionCount = () => {
        const count =
          (regions.getRegions?.()?.length ?? Object.keys(regions.regions ?? {}).length) || 0;
        setRegionCount(count);
      };

      const onRegionCreated = (region: unknown) => {
        const regionData = region as WaveRegion | null;
        if (!regionData) return;
        const regionsList = regions.getRegions?.() ?? Object.values(regions.regions ?? {});
        for (const existing of regionsList as WaveRegion[]) {
          if (existing.id !== regionData.id) {
            existing.remove?.();
          }
        }
        activeRegionRef.current = regionData;
        setSelection({ start: regionData.start, end: regionData.end });
        setSelectionDuration(Math.max(0, regionData.end - regionData.start));
        updateRegionCount();
        regionsRef.current?.disableDragSelection?.();
      };
      const onRegionUpdated = (region: unknown) => {
        const regionData = region as WaveRegion | null;
        if (!regionData) return;
        activeRegionRef.current = regionData;
        setSelection({ start: regionData.start, end: regionData.end });
        setSelectionDuration(Math.max(0, regionData.end - regionData.start));
        updateRegionCount();
      };
      const onRegionClicked = (region: unknown) => {
        const regionData = region as WaveRegion | null;
        if (!regionData) return;
        activeRegionRef.current = regionData;
        setSelection({ start: regionData.start, end: regionData.end });
        setSelectionDuration(Math.max(0, regionData.end - regionData.start));
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
        wave.on?.("region-created", onRegionCreated);
        wave.on?.("region-updated", onRegionUpdated);
        wave.on?.("region-clicked", onRegionClicked);
        wave.on?.("region-removed", onRegionRemoved);
      }
      wave.on?.("play", () => setIsPlaying(true));
      wave.on?.("pause", () => setIsPlaying(false));
      wave.on?.("finish", () => setIsPlaying(false));
      wave.on?.("audioprocess", (time: unknown) => {
        const numericTime = typeof time === "number" ? time : 0;
        const duration = wave.getDuration?.() ?? 0;
        if (duration > 0) {
          setPlayheadRatio(Math.min(1, Math.max(0, numericTime / duration)));
        }
      });
      wave.on?.("seek", (progress: unknown) => {
        const ratio = typeof progress === "number" ? progress : 0;
        setPlayheadRatio(Math.min(1, Math.max(0, ratio)));
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
      if (waveInstance) waveInstance.destroy?.();
      if (waveformRef.current) {
        waveformRef.current.innerHTML = "";
      }
      setPlayheadRatio(null);
    };
  }, [trackId, waveKey]);

  const getRegionsList = (): WaveRegion[] => {
    const regionsApi = regionsRef.current;
    if (!regionsApi) return [];
    if (regionsApi.getRegions) return regionsApi.getRegions();
    if (regionsApi.regions) return Object.values(regionsApi.regions) as WaveRegion[];
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
    waveRef.current.setTime?.(start);
    waveRef.current.seekTo?.(start / Math.max(1, waveRef.current.getDuration?.() ?? 1));
    waveRef.current.play?.();
    stopTimerRef.current = window.setTimeout(() => {
      waveRef.current?.pause?.();
    }, Math.max(0.2, end - start) * 1000);
  };

  const handlePlaySelection = () => {
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
  };

  const handleSaveSnippet = async () => {
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
  };

  const handleClearSelection = () => {
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
  };

  return (
    <TrackWaveformView
      waveformRef={waveformRef}
      waveKey={waveKey}
      selection={selection}
      selectionDuration={selectionDuration}
      loadingWave={loadingWave}
      playheadRatio={playheadRatio}
      isPlaying={isPlaying}
      regionCount={regionCount}
      saveMessage={saveMessage}
      saveError={saveError}
      onPlaySelection={handlePlaySelection}
      onSaveSnippet={handleSaveSnippet}
      onClearSelection={handleClearSelection}
    />
  );
}
