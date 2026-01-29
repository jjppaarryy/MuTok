type RepairInput = {
  onscreenText: string;
  caption: string;
  hookFamily: string;
  container: string;
  allowedIntents: string[];
  preferredIntent?: string;
  snippet: {
    moment3to7?: boolean;
    moment7to11?: boolean;
  };
  bannedWords: string[];
  openAiApiKey?: string;
  model?: string;
};

type RepairResult = {
  onscreenText: string;
  repairApplied: boolean;
  repairType?: "llm_repair" | "twoBeatFallback" | "truncate_lines";
};

const maxLineLength = 40;
const maxTotalLength = 80;

// Beat 2 instruction keywords that indicate a proper CTA
const beat2InstructionKeywords = [
  "wait", "keep", "skip", "comment", "pick", "follow", "name", "where", "which", "choose",
  "honest", "tell", "rate", "guess", "vote", "decide", "drop", "share", "save", "?",
  "a or b", "yes or no", "warm-up", "peak"
];

export type TwoBeatValidationResult = {
  valid: boolean;
  reason?: string;
  beat1Length: number;
  beat2Length: number;
  totalLength: number;
  hasBeat2Instruction: boolean;
};

export function validateTwoBeatStructure(onscreenText: string): TwoBeatValidationResult {
  const lines = onscreenText.split("\n").map((line) => line.trim()).filter(Boolean);
  
  if (lines.length < 2) {
    return {
      valid: false,
      reason: "Missing two-beat structure (need exactly 2 lines)",
      beat1Length: lines[0]?.length ?? 0,
      beat2Length: 0,
      totalLength: onscreenText.length,
      hasBeat2Instruction: false
    };
  }
  
  const beat1 = lines[0] ?? "";
  const beat2 = lines[1] ?? "";
  const beat1Length = beat1.length;
  const beat2Length = beat2.length;
  const totalLength = beat1Length + beat2Length;
  
  // Check if Beat 2 contains an instruction keyword
  const beat2Lower = beat2.toLowerCase();
  const hasBeat2Instruction = beat2InstructionKeywords.some((kw) => beat2Lower.includes(kw));
  
  // Validation checks
  if (totalLength > maxTotalLength) {
    return {
      valid: false,
      reason: `Total length too long (${totalLength} > ${maxTotalLength} chars)`,
      beat1Length,
      beat2Length,
      totalLength,
      hasBeat2Instruction
    };
  }
  
  if (!hasBeat2Instruction) {
    return {
      valid: false,
      reason: "Beat 2 missing instruction keyword (wait/keep/skip/comment/pick/etc.)",
      beat1Length,
      beat2Length,
      totalLength,
      hasBeat2Instruction
    };
  }
  
  if (beat1.includes("?")) {
    return {
      valid: false,
      reason: "Beat 1 should not be a question (questions go in Beat 2)",
      beat1Length,
      beat2Length,
      totalLength,
      hasBeat2Instruction
    };
  }
  
  return {
    valid: true,
    beat1Length,
    beat2Length,
    totalLength,
    hasBeat2Instruction
  };
}

const normalizeLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const typoFixes: Array<[RegExp, string]> = [
  [/\bsttuborn\b/gi, "stubborn"],
  [/\bsttubborn\b/gi, "stubborn"],
  [/\bsttubbornness\b/gi, "stubbornness"]
];

const fixTypos = (text: string) =>
  typoFixes.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);

const looksTruncated = (line: string) => {
  if (line.length < 18) return false;
  if (/[.!?]$/.test(line)) return false;
  const lastWord = line.split(/\s+/).pop() ?? "";
  return lastWord.length > 0 && lastWord.length <= 7;
};

const compressLine = (text: string, bannedWords: string[]) => {
  const lowerBanned = bannedWords.map((word) => word.toLowerCase());
  const tokens = fixTypos(text)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !lowerBanned.some((bad) => token.toLowerCase().includes(bad)));
  const candidate = tokens.join(" ").trim();
  return candidate.replace(/[.,!?]+$/, "");
};

const instructionLibrary = {
  KEEP_SKIP: ["KEEP or SKIP?", "Give me 2.5 seconds.", "Would you play this?"],
  COMMENT_VIBE: [
    "If you're here, say hi.",
    "Warm-up or peak?",
    "Say hi if you're here.",
    "Where would you drop this?"
  ],
  FOLLOW_FULL: ["Follow for the ID.", "Follow for the full ID."],
  PICK_AB: ["Pick A or B?", "Pick A/B."]
};

const pickInstruction = (input: RepairInput, requireTimestamp: boolean) => {
  const allowed = input.allowedIntents.length
    ? input.allowedIntents
    : Object.keys(instructionLibrary);
  const preferred = input.preferredIntent && allowed.includes(input.preferredIntent)
    ? [input.preferredIntent, ...allowed.filter((intent) => intent !== input.preferredIntent)]
    : allowed;
  const prefersKeepSkip =
    input.container === "montage" || input.hookFamily === "keep_skip" || input.hookFamily === "stakes";
  const prefersDj = input.hookFamily === "dj_context";
  const prefersWait =
    input.hookFamily === "wait_for_it" && Boolean(input.snippet?.moment7to11);

  if (prefersWait && requireTimestamp) return "Wait for 0:07.";
  if (prefersDj) return "Comment warm-up or peak?";
  if (prefersKeepSkip && preferred.includes("KEEP_SKIP")) return "KEEP or SKIP?";

  for (const intent of preferred) {
    const options = instructionLibrary[intent as keyof typeof instructionLibrary];
    if (!options?.length) continue;
    const filtered = requireTimestamp
      ? options
      : options.filter((line) => !line.toLowerCase().includes("timestamp") && !line.toLowerCase().includes("wait for"));
    if (filtered.length > 0) return filtered[0];
  }

  return "Where would you drop it?";
};

const buildRepairPrompt = (input: RepairInput) => {
  return [
    "Return JSON only with exactly one field: { \"onscreen_text\": \"Line 1\\nLine 2\" }.",
    "Rewrite onscreen_text into exactly two lines.",
    `Line 1: hook <= ${maxLineLength} chars.`,
    `Line 2: instruction <= ${maxLineLength} chars.`,
    "Keep meaning and CTA intent. Do not add extra fields.",
    `Hook family: ${input.hookFamily}`,
    `Container: ${input.container}`,
    `Allowed intents: ${input.allowedIntents.join(", ")}`,
    `Original onscreen_text: ${input.onscreenText}`,
    `Caption: ${input.caption}`
  ].join("\n");
};

const buildSpellcheckPrompt = (text: string) => {
  return [
    "Return JSON only with exactly one field: { \"onscreen_text\": \"Line 1\\nLine 2\" }.",
    "Fix spelling and typos only. Do not change wording or meaning.",
    "Preserve the two-line structure and punctuation.",
    `Original onscreen_text: ${text}`
  ].join("\n");
};

const parseJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { onscreen_text?: string };
  } catch {
    return null;
  }
};

const attemptLlmRepair = async (input: RepairInput) => {
  if (!input.openAiApiKey) return null;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: input.model ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: buildRepairPrompt(input) }
      ],
      temperature: 0.2
    })
  });
  if (!response.ok) return null;
  const raw = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const candidate = parseJson(raw.choices?.[0]?.message?.content ?? "");
  if (!candidate?.onscreen_text) return null;
  const lines = normalizeLines(candidate.onscreen_text);
  if (lines.length !== 2) return null;
  if (lines.some((line) => line.length > maxLineLength)) return null;
  return `${lines[0]}\n${lines[1]}`;
};

const attemptSpellcheck = async (input: RepairInput, text: string) => {
  if (!input.openAiApiKey) return null;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: input.model ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: buildSpellcheckPrompt(text) }
      ],
      temperature: 0
    })
  });
  if (!response.ok) return null;
  const raw = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const candidate = parseJson(raw.choices?.[0]?.message?.content ?? "");
  if (!candidate?.onscreen_text) return null;
  const lines = normalizeLines(candidate.onscreen_text);
  if (lines.length !== 2) return null;
  return `${lines[0]}\n${lines[1]}`;
};

export async function ensureTwoBeat(input: RepairInput): Promise<RepairResult> {
  const requireTimestamp = Boolean(
    input.hookFamily === "wait_for_it" &&
    (input.snippet?.moment3to7 || input.snippet?.moment7to11)
  );
  const lines = normalizeLines(input.onscreenText);
  if (lines.length >= 2) {
    const shouldRepair =
      Boolean(input.openAiApiKey) && lines.slice(0, 2).some((line) => looksTruncated(line));
    if (shouldRepair) {
      const llmRepair = await attemptLlmRepair(input);
      if (llmRepair) {
        return { onscreenText: llmRepair, repairApplied: true, repairType: "llm_repair" };
      }
    }
    const trimmed = lines.slice(0, 2).map((line) => compressLine(line, input.bannedWords));
    let repaired = `${trimmed[0]}\n${trimmed[1]}`;
    if (!requireTimestamp && repaired.toLowerCase().includes("timestamp")) {
      repaired = `${trimmed[0]}\n${compressLine(pickInstruction(input, false), input.bannedWords)}`;
    }
    const spellchecked = await attemptSpellcheck(input, repaired);
    if (spellchecked && spellchecked !== repaired) {
      repaired = spellchecked;
      return { onscreenText: repaired, repairApplied: true, repairType: "llm_repair" };
    }
    if (lines.length > 2 || repaired !== input.onscreenText) {
      return { onscreenText: repaired, repairApplied: true, repairType: "truncate_lines" };
    }
    return { onscreenText: input.onscreenText, repairApplied: false };
  }

  const llmRepair = await attemptLlmRepair(input);
  if (llmRepair) {
    return { onscreenText: llmRepair, repairApplied: true, repairType: "llm_repair" };
  }

  const line1 = compressLine(lines[0] ?? input.onscreenText, input.bannedWords);
  const line2 = compressLine(pickInstruction(input, requireTimestamp), input.bannedWords);
  const fallback = `${line1}\n${line2}`;
  const spellchecked = await attemptSpellcheck(input, fallback);
  return {
    onscreenText: spellchecked ?? fallback,
    repairApplied: true,
    repairType: "twoBeatFallback"
  };
}
