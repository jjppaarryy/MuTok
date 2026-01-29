import { fetchWithTimeout, TIMEOUTS } from "./fetchWithTimeout";
import { getConfig } from "./config";
import { prisma } from "./prisma";
import { getAnalyticsSummary } from "./analytics";

export type RecipeSuggestion = {
  name: string;
  beat1Text: string;
  beat2Text: string;
  captionText: string;
  ctaType: string;
  containerAllowed: "static_daw" | "montage" | "both";
  allowedSnippetTypes: string[];
};

const buildPrompt = (winners: Array<{ name: string; beat1: string; beat2: string; caption: string }>) => {
  const examples = winners.map((winner) => ({
    name: winner.name,
    beat1: winner.beat1,
    beat2: winner.beat2,
    caption: winner.caption
  }));
  return [
    "You are proposing new TikTok hook recipes based on winning patterns.",
    "Return JSON ONLY. No markdown, no commentary.",
    "Create 10 new recipes. Keep the tone punchy, confident, UK.",
    "Each recipe must include:",
    "- name",
    "- beat1Text",
    "- beat2Text",
    "- captionText",
    "- ctaType (KEEP_SKIP | COMMENT_VIBE | FOLLOW_FULL | PICK_AB)",
    "- containerAllowed (static_daw | montage | both)",
    "- allowedSnippetTypes (array; use moment_3_7, moment_7_11, or empty)",
    "",
    "Winning recipes:",
    JSON.stringify(examples, null, 2)
  ].join("\n");
};

export async function proposeRecipes(): Promise<RecipeSuggestion[]> {
  const apiKey = await getConfig("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const summary = await getAnalyticsSummary();
  const topNames = summary.recipeLeaderboard.slice(0, 5).map((row) => String(row.recipe));
  const recipes = await prisma.hookRecipe.findMany({
    where: { name: { in: topNames } },
    select: { name: true, beat1Templates: true, beat2Templates: true, captionTemplate: true }
  });

  const pickTemplate = (value: unknown) => {
    if (!Array.isArray(value)) return "";
    const first = value[0];
    return typeof first === "string" ? first : "";
  };

  const winners = recipes.map((recipe) => ({
    name: recipe.name,
    beat1: pickTemplate(recipe.beat1Templates),
    beat2: pickTemplate(recipe.beat2Templates),
    caption: recipe.captionTemplate ?? ""
  }));

  const prompt = buildPrompt(winners);
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        messages: [
          { role: "system", content: "Return JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    },
    TIMEOUTS.LONG
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  const raw = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const responseText = raw.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(responseText) as RecipeSuggestion[];
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid suggestions response");
  }
  return parsed;
}
