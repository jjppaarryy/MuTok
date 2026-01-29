import { removeGenderedLanguage } from "./inspo";
import { validateCtaRelevance } from "./relevanceValidator";
import { getConfig } from "./config";

type LlmVariant = {
  beat1: string;
  beat2: string;
  notes?: string;
};

type InspoContext = {
  title?: string | null;
  copy?: string | null;
  description?: string | null;
  whyItWorks?: string | null;
  howToUse?: string | null;
  purposeTags?: string[] | null;
  themeTags?: string[] | null;
  genreTags?: string[] | null;
};

const normalizeLine = (value: string) => value.replace(/\s+/g, " ").trim();
const clampLine = (value: string) => normalizeLine(value);

const sanitizeBeat2 = (line: string) => {
  const cleaned = normalizeLine(line);
  if (cleaned.toLowerCase().includes("timestamp")) return "KEEP or SKIP?";
  if (/\b0:\d{2}\b/.test(cleaned)) return "KEEP or SKIP?";
  return cleaned;
};

const dedupe = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const deriveCtaIntent = (beat2: string) => {
  const lower = beat2.toLowerCase();
  if (lower.includes("follow")) return "FOLLOW_FULL";
  if (lower.includes("pick") || lower.includes("a or b")) return "PICK_AB";
  if (lower.includes("comment") || lower.includes("vibe") || lower.includes("warm-up")) {
    return "COMMENT_VIBE";
  }
  if (lower.includes("keep") || lower.includes("skip")) return "KEEP_SKIP";
  return "KEEP_SKIP";
};

const buildPrompt = (input: InspoContext, count: number) => {
  return [
    "You are generating TikTok hook variations from inspo.",
    "Return JSON only:",
    `{ "variants": [ { "beat1": "string", "beat2": "string", "notes": "string?" } ] }`,
    `Constraints:`,
    `- beat1 and beat2 should be concise`,
    `- beat2 must be an instruction`,
    `- no gendered terms, no filler (hope, please, let me know, new track)`,
    `- keep tone confident, minimal, music-first`,
    `- do NOT use timestamps unless explicitly mentioned in the inspo copy`,
    `- avoid generic CTAs if the inspo already suggests a specific CTA`,
    `- produce ${count} variants`,
    "",
    "Inspo context:",
    JSON.stringify(input, null, 2)
  ].join("\n");
};

const parseJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { variants?: LlmVariant[] };
  } catch {
    return null;
  }
};

export const generateInspoVariants = async (
  context: InspoContext,
  count = 4
): Promise<LlmVariant[]> => {
  const apiKey = await getConfig("OPENAI_API_KEY");
  if (!apiKey) return [];
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const prompt = buildPrompt(context, count);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) return [];
  const raw = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = raw.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(text);
  const variants = parsed?.variants ?? [];
  if (!variants.length) return [];

  const cleaned = variants
    .map((variant) => {
      const beat1 = clampLine(removeGenderedLanguage(variant.beat1 ?? "") ?? "");
      const beat2 = clampLine(sanitizeBeat2(removeGenderedLanguage(variant.beat2 ?? "") ?? ""));
      if (!beat1 || !beat2) return null;
      const relevance = validateCtaRelevance({
        beat1,
        beat2,
        hookFamily: "inspo_seed",
        comparisonMode: false,
        optionsCount: 1
      });
      return {
        beat1,
        beat2: relevance.beat2,
        notes: variant.notes
      };
    })
    .filter((variant): variant is LlmVariant => Boolean(variant));

  const deduped = dedupe(cleaned.map((item) => `${item.beat1}\n${item.beat2}`)).map(
    (combined) => {
      const [beat1, beat2] = combined.split("\n");
      return { beat1, beat2 };
    }
  );

  return deduped.slice(0, count);
};

export const buildSeedPatternsFromVariants = (variants: LlmVariant[]) => {
  const beat1Templates = dedupe(variants.map((variant) => variant.beat1));
  const beat2Templates = dedupe(variants.map((variant) => variant.beat2));
  const intents = dedupe(variants.map((variant) => deriveCtaIntent(variant.beat2)));

  return [
    {
      core_mechanic: "inspo_llm",
      hook_family: "inspo_seed",
      cta_intents_allowed: intents,
      music_first_variants: variants
    }
  ];
};
