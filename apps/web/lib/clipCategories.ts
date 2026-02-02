export type ClipMoment = "calm" | "build" | "peak" | "neutral";

export const clipMoments: ClipMoment[] = ["calm", "build", "peak", "neutral"];

export const clipMomentLabels: Record<ClipMoment, string> = {
  calm: "Calm (no drums)",
  build: "Build (rising)",
  peak: "Peak (drums)",
  neutral: "Neutral"
};

const legacyCategoryMap: Record<string, ClipMoment> = {
  DAW_screen: "calm",
  Studio_portrait: "calm",
  Hands_knobs_faders: "calm",
  Hands_keys_abstract: "peak",
  Hands_keys_literal: "peak",
  Lifestyle_broll: "calm",
  Abstract_visual: "calm",
  Text_background: "calm",
  DJing: "peak",
  Crowd_stage: "peak"
};

export const normalizeClipCategory = (category: string): ClipMoment => {
  if (clipMoments.includes(category as ClipMoment)) {
    return category as ClipMoment;
  }
  return legacyCategoryMap[category] ?? "neutral";
};
