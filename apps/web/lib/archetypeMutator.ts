import { prisma } from "./prisma";
import { getConfig } from "./config";

type ArchetypeInput = {
  allowedIntents: string[];
  guardrails: { banned_words: string[]; banned_phrases: string[] };
  existingNames: string[];
};

type ArchetypeOutput = {
  name: string;
  beat1: string;
  beat2: string;
  cta_intent: string;
};

const extractJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

const parseJson = (text: string) => {
  const jsonText = extractJson(text);
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText) as ArchetypeOutput;
  } catch {
    return null;
  }
};

const isValid = (
  output: ArchetypeOutput,
  allowedIntents: string[],
  guardrails: ArchetypeInput["guardrails"]
) => {
  if (!output.name || !output.beat1 || !output.beat2) return false;
  if (output.beat1.includes("\n") || output.beat2.includes("\n")) return false;
  if (!allowedIntents.includes(output.cta_intent)) return false;
  const combined = `${output.beat1} ${output.beat2}`.toLowerCase();
  if (guardrails.banned_words.some((word) => combined.includes(word))) return false;
  if (guardrails.banned_phrases.some((phrase) => combined.includes(phrase))) return false;
  return true;
};

const buildPrompt = (input: ArchetypeInput) => {
  return [
    "You are creating a brand-new TikTok hook archetype for music-first posts.",
    "Return JSON only with fields: { name, beat1, beat2, cta_intent }",
    "Rules:",
    "- beat1 and beat2 must be short, punchy (max 30-40 chars each), and different from existing lines",
    "- beat2 should be an instruction or call to action (e.g. wait, keep, skip, comment, name the vibe, etc)",
    "- USE PROPER PUNCTUATION: questions MUST end with ? and statements with . or !",
    "- no timestamps unless explicitly required (avoid them by default)",
    "- avoid banned words/phrases",
    `- allowed cta_intent values: ${input.allowedIntents.join(", ")}`,
    "",
    "Examples of style:",
    "- Line 1: \"You're early. Unreleased.\"",
    "- Line 2: \"KEEP or SKIP?\"",
    "",
    "Return one new archetype only."
  ].join("\n");
};

export async function maybeCreateNewArchetype(input: ArchetypeInput) {
  const apiKey = await getConfig("OPENAI_API_KEY");
  if (!apiKey) return null;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const prompt = buildPrompt(input);
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
      temperature: 0.5
    })
  });
  if (!response.ok) return null;
  const raw = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = raw.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(text);
  if (!parsed) return null;
  if (!isValid(parsed, input.allowedIntents, input.guardrails)) return null;

  let name = parsed.name.trim();
  if (!name.toLowerCase().startsWith("evolved")) {
    name = `Evolved ${name}`;
  }
  if (input.existingNames.includes(name)) {
    const suffix = Math.random().toString(36).slice(2, 6);
    name = `${name} ${suffix}`;
  }

  return prisma.hookRecipe.create({
    data: {
      name,
      enabled: true,
      locked: false,
      beat1Templates: [parsed.beat1.trim()],
      beat2Templates: [parsed.beat2.trim()],
      ctaType: parsed.cta_intent,
      allowedSnippetTypes: [],
      disallowedContainers: [],
      source: "evolve"
    }
  });
}
