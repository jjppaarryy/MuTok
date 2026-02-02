import { BrainRunContext } from "./brainRunContext";

export const buildBannedWords = (settings: BrainRunContext["settings"]) => [
  ...settings.guardrails.banned_phrases,
  ...settings.guardrails.banned_words,
  ...settings.voice_banned_words
];

export const buildCtaMatchers = (): Record<string, string[]> => ({
  KEEP_SKIP: ["keep", "skip", "2.5", "give me", "listen", "would you play"],
  COMMENT_VIBE: [
    "comment",
    "say hi",
    "here",
    "warm-up",
    "peak",
    "where would you drop",
    "is it you",
    "worth it",
    "show yourself",
    "stay a second",
    "give it 5",
    "you get it",
    "too much",
    "just 20",
    "hold me to it",
    "be honest",
    "what now",
    "do you hear it",
    "are you one",
    "too dramatic",
    "are you it",
    "deal",
    "test it",
    "what are you into",
    "unlucky",
    "welcome in",
    "you in",
    "listen properly",
    "we're not the same",
    "one of them"
  ],
  FOLLOW_FULL: ["follow"],
  SAVE_REWATCH: ["save", "rewatch", "watch again", "loop it", "play it again"],
  LINK_DM: ["link", "dm", "message me", "in bio", "bio"],
  PICK_AB: ["pick", "a/b", "choose"]
});

export const deriveCtaIntent = (params: {
  hookFamily: string;
  container: string;
  allowed: string[];
  snippet?: { moment3to7?: boolean; moment7to11?: boolean };
}) => {
  const allowed = params.allowed.length ? params.allowed : Object.keys(buildCtaMatchers());
  const prefer = (intents: string[]) => intents.find((intent) => allowed.includes(intent));
  if (params.container === "montage") {
    return prefer(["KEEP_SKIP", "COMMENT_VIBE", "FOLLOW_FULL", "SAVE_REWATCH", "LINK_DM", "PICK_AB"]) ?? allowed[0];
  }
  if (params.hookFamily === "wait_for_it") {
    const hasMoment = params.snippet?.moment3to7 || params.snippet?.moment7to11;
    return hasMoment
      ? prefer(["COMMENT_VIBE", "KEEP_SKIP", "SAVE_REWATCH", "FOLLOW_FULL", "LINK_DM", "PICK_AB"]) ?? allowed[0]
      : prefer(["KEEP_SKIP", "SAVE_REWATCH", "FOLLOW_FULL", "LINK_DM", "PICK_AB"]) ?? allowed[0];
  }
  if (params.hookFamily === "youre_early") {
    return prefer(["KEEP_SKIP", "FOLLOW_FULL", "COMMENT_VIBE", "SAVE_REWATCH", "LINK_DM"]) ?? allowed[0];
  }
  if (params.hookFamily === "dj_context") {
    return prefer(["COMMENT_VIBE", "KEEP_SKIP", "SAVE_REWATCH", "FOLLOW_FULL", "LINK_DM"]) ?? allowed[0];
  }
  if (params.hookFamily === "emotional_lift") {
    return prefer(["COMMENT_VIBE", "KEEP_SKIP", "SAVE_REWATCH", "FOLLOW_FULL", "LINK_DM"]) ?? allowed[0];
  }
  return prefer(["KEEP_SKIP", "COMMENT_VIBE", "FOLLOW_FULL", "SAVE_REWATCH", "LINK_DM", "PICK_AB"]) ?? allowed[0];
};

export const enforceCtaIntent = (line2: string, intent: string) => {
  const tokens = buildCtaMatchers()[intent] ?? [];
  const lower = line2.toLowerCase();
  return tokens.some((token: string) => lower.includes(token));
};
