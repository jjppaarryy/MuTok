import { prisma } from "./prisma";
import { getConfig } from "./config";

type MutationInput = {
  recipeId: string;
  recipeName: string;
  beat1Templates: string[];
  beat2Templates: string[];
  allowedIntents: string[];
  guardrails: {
    banned_words: string[];
    banned_phrases: string[];
  };
};

type MutationResult = {
  new_variants?: Array<{
    beat1: string;
    beat2: string;
    caption_template?: string;
    cta_intent?: string;
  }>;
  new_ctas?: Array<{
    name: string;
    template: string;
    intent: string;
  }>;
};

const extractJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

const parseJson = (text: string): MutationResult => {
  const jsonText = extractJson(text);
  if (!jsonText) throw new Error("No JSON found");
  return JSON.parse(jsonText) as MutationResult;
};

const validateVariant = (
  beat1: string,
  beat2: string,
  guardrails: MutationInput["guardrails"]
) => {
  if (beat1.includes("\n") || beat2.includes("\n")) return false;
  const combined = `${beat1} ${beat2}`.toLowerCase();
  if (guardrails.banned_words.some((word) => combined.includes(word))) return false;
  if (guardrails.banned_phrases.some((phrase) => combined.includes(phrase))) return false;
  return true;
};

const validateCta = (
  cta: { template: string; intent: string },
  allowedIntents: string[],
  guardrails: MutationInput["guardrails"]
) => {
  if (!allowedIntents.includes(cta.intent)) return false;
  const combined = cta.template.toLowerCase();
  if (guardrails.banned_words.some((word) => combined.includes(word))) return false;
  if (guardrails.banned_phrases.some((phrase) => combined.includes(phrase))) return false;
  return true;
};

const mutationPrompt = (input: MutationInput) => {
  return [
    "You are evolving TikTok hook recipes within strict guardrails.",
    "Return ONLY JSON:",
    "{ new_variants: [{ beat1, beat2, caption_template?, cta_intent? }], new_ctas: [{ name, template, intent }] }",
    "",
    "Rules:",
    "- beat1 should be concise (max 30-40 chars)",
    "- beat2 should be an instruction or call to action (e.g. wait, keep, skip, comment, name the vibe, etc) (max 30-40 chars)",
    "- USE PROPER PUNCTUATION: questions MUST end with ? and statements with . or !",
    "- no filler phrases or banned words",
    "- keep intent consistent with recipe",
    "- generate 3-6 variants only",
    "",
    `Recipe: ${input.recipeName}`,
    `Beat1 templates: ${input.beat1Templates.join(" | ")}`,
    `Beat2 templates: ${input.beat2Templates.join(" | ")}`,
    `Allowed CTA intents: ${input.allowedIntents.join(", ")}`
  ].join("\n");
};

export async function maybeMutateRecipe(input: MutationInput) {
  const apiKey = await getConfig("OPENAI_API_KEY");
  if (!apiKey) return;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const prompt = mutationPrompt(input);
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
      temperature: 0.3
    })
  });
  if (!response.ok) return;
  const raw = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = raw.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(text);
  const existingCtas = await prisma.cta.findMany({
    where: { intent: { in: input.allowedIntents } }
  });
  const intentMap = new Map<string, string[]>();
  for (const cta of existingCtas) {
    intentMap.set(cta.intent, [...(intentMap.get(cta.intent) ?? []), cta.id]);
  }

  for (const cta of parsed.new_ctas ?? []) {
    if (!validateCta(cta, input.allowedIntents, input.guardrails)) continue;
    const created = await prisma.cta.create({
      data: {
        name: cta.name,
        template: cta.template,
        intent: cta.intent,
        status: "testing",
        createdBy: "ai"
      }
    });
    intentMap.set(cta.intent, [...(intentMap.get(cta.intent) ?? []), created.id]);
  }

  const createdVariants = parsed.new_variants ?? [];
  for (const variant of createdVariants) {
    if (!validateVariant(variant.beat1, variant.beat2, input.guardrails)) continue;
    if (variant.cta_intent && !input.allowedIntents.includes(variant.cta_intent)) continue;
    const ctaIds = variant.cta_intent ? intentMap.get(variant.cta_intent) : undefined;
    const ctaId = ctaIds?.[0];
    await prisma.variant.create({
      data: {
        recipeId: input.recipeId,
        beat1: variant.beat1,
        beat2: variant.beat2,
        captionTemplate: variant.caption_template ?? null,
        ctaId: ctaId ?? null,
        status: "testing",
        createdBy: "ai"
      }
    });
  }
}

