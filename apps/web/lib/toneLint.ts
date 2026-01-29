import { fetchWithTimeout, TIMEOUTS } from "./fetchWithTimeout";

type ToneLintInput = {
  onscreenText: string;
  caption: string;
  hookFamily: string;
  ctaIntent: string;
  voiceProfile: string;
  bannedWords: string[];
  voiceAnchors: string[];
  openAiApiKey?: string;
  model?: string;
};

export type ToneLintResult = {
  onscreenText: string;
  caption: string;
  rewritten: boolean;
  reasons: string[];
};

const genericPhrases = [
  /this one hits/i,
  /turn it up/i,
  /feel the beat/i,
  /you won't believe/i,
  /drop incoming/i,
  /bestie/i,
  /\bfire\b/i,
  /\bbanger\b/i,
  /\binsane\b/i,
  /\bcrazy\b/i
];

const extractJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

const parseJson = (text: string) => {
  const jsonText = extractJson(text);
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText) as { onscreen_text?: string; caption?: string };
  } catch {
    return null;
  }
};

const containsBanned = (text: string, bannedWords: string[]) => {
  const lower = text.toLowerCase();
  return bannedWords.some((word) => lower.includes(word.toLowerCase()));
};

export async function toneLintPost(input: ToneLintInput): Promise<ToneLintResult> {
  const combined = `${input.onscreenText} ${input.caption}`;
  const reasons: string[] = [];

  if (containsBanned(combined, input.bannedWords)) {
    reasons.push("banned_words");
  }
  if (genericPhrases.some((pattern) => pattern.test(combined))) {
    reasons.push("generic_tiktok_phrase");
  }

  if (reasons.length === 0) {
    return {
      onscreenText: input.onscreenText,
      caption: input.caption,
      rewritten: false,
      reasons: []
    };
  }

  if (!input.openAiApiKey) {
    return {
      onscreenText: input.onscreenText,
      caption: input.caption,
      rewritten: false,
      reasons
    };
  }

  const anchors = input.voiceAnchors.length
    ? input.voiceAnchors.map((line) => `- ${line}`).join("\n")
    : "- Keep it dry, self-aware, understated.";

  const prompt = [
    "Rewrite the onscreen_text and caption to match the voice profile.",
    "Keep hook_family and CTA intent unchanged.",
    "Keep onscreen_text exactly two lines separated by a single newline.",
    "Keep line 2 short (2-6 words).",
    "Avoid banned words/phrases and generic TikTok hype.",
    "Return JSON only with keys: onscreen_text, caption.",
    "",
    `voice_profile: ${input.voiceProfile}`,
    `hook_family: ${input.hookFamily}`,
    `cta_intent: ${input.ctaIntent}`,
    `banned_words: ${input.bannedWords.join(", ")}`,
    "voice_anchors:",
    anchors,
    "",
    `onscreen_text: ${input.onscreenText}`,
    `caption: ${input.caption}`
  ].join("\n");

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.model ?? "gpt-4o",
        messages: [
          { role: "system", content: "Return JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    },
    TIMEOUTS.LONG
  );

  if (!response.ok) {
    return {
      onscreenText: input.onscreenText,
      caption: input.caption,
      rewritten: false,
      reasons
    };
  }

  const raw = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = raw.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(content);
  if (!parsed?.onscreen_text || !parsed?.caption) {
    return {
      onscreenText: input.onscreenText,
      caption: input.caption,
      rewritten: false,
      reasons
    };
  }

  const lines = parsed.onscreen_text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 2) {
    return {
      onscreenText: input.onscreenText,
      caption: input.caption,
      rewritten: false,
      reasons
    };
  }

  return {
    onscreenText: `${lines[0]}\n${lines[1]}`,
    caption: parsed.caption.trim(),
    rewritten: true,
    reasons
  };
}
