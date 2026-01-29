import {
  brainSchema,
  BrainPlan
} from "../../../packages/core/src/brainSchema";
import { fetchWithTimeout, TIMEOUTS } from "./fetchWithTimeout";
import { getConfig } from "./config";

export type BrainInput = {
  settings: Record<string, unknown>;
  clips: Array<Record<string, unknown>>;
  snippets: Array<Record<string, unknown>>;
  metricsSummary: Record<string, unknown>;
  queueState: Record<string, unknown>;
};

export function validateBrainPlan(raw: unknown): BrainPlan {
  return brainSchema.parse(raw);
}

const brainSchemaJson = JSON.stringify(
  {
    run_id: "string",
    posts: [
      {
        scheduled_for: "ISO date",
        container: "static_daw | montage",
        clip_ids: ["string"],
        track_id: "string",
        snippet_id: "string",
        onscreen_text: "string",
        caption: "string",
        hook_family: "string",
        confidence: 0.0,
        reasons: ["string"]
      }
    ]
  },
  null,
  2
);

const extractJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
};

const parseJson = (text: string) => {
  const jsonText = extractJson(text);
  if (!jsonText) {
    throw new Error("No JSON found in LLM response");
  }
  return JSON.parse(jsonText);
};

const buildPrompt = (input: BrainInput, systemPrompt: string) => {
  return [
    systemPrompt,
    "Return ONLY valid JSON matching this schema:",
    brainSchemaJson,
    "",
    "Viral mechanics rules:",
    "- Must include at least 2 retention levers and 1 interaction lever.",
    "- On-screen text must be two beats: Beat1 (0:00-0:02) then Beat2 (0:02-0:05).",
    "- Beat1 should be concise and clear.",
    "- Beat2 must include an instruction (wait/keep/skip/comment/pick).",
    "- Never use filler words: hope, please, let me know, new track.",
    "- Always include one CTA from allowed list in settings.",
    "- Snippet must include a moment in 3-7s and another in 7-11s if possible.",
    "- If montage: first cut around 0:02-0:03 to reset attention.",
    "- CTA must be one of: KEEP/SKIP, comment vibe, follow for full ID, pick A/B.",
    "- Caption must start with topic keywords from settings (not the hook).",
    "",
    "Input data:",
    JSON.stringify(input, null, 2)
  ].join("\n");
};

type BrainResult = {
  plan: BrainPlan;
  prompt: string;
  responseText: string;
};

export async function runBrain(
  input: BrainInput,
  systemPrompt: string
): Promise<BrainResult> {
  const apiKey = await getConfig("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Please configure it in Settings.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const prompt = buildPrompt(input, systemPrompt);

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a strict JSON generator. Output JSON only."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.4
      })
    },
    TIMEOUTS.LONG
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const raw = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const responseText = raw.choices?.[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = parseJson(responseText);
    return { plan: brainSchema.parse(parsed), prompt, responseText };
  } catch (parseError) {
    console.warn("Initial brain response failed to parse, attempting repair:", parseError);
    
    const repairPrompt = [
      "Fix the JSON to match the schema exactly. Return JSON only.",
      brainSchemaJson,
      "",
      "Broken response:",
      responseText
    ].join("\n");

    const repairResponse = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a strict JSON repair tool. Output JSON only."
            },
            { role: "user", content: repairPrompt }
          ],
          temperature: 0
        })
      },
      TIMEOUTS.LONG
    );

    if (!repairResponse.ok) {
      const text = await repairResponse.text();
      throw new Error(`OpenAI repair error: ${text}`);
    }

    const repairRaw = (await repairResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const repairText = repairRaw.choices?.[0]?.message?.content ?? "";
    
    try {
      parsed = parseJson(repairText);
      return {
        plan: brainSchema.parse(parsed),
        prompt,
        responseText: repairText
      };
    } catch (repairParseError) {
      console.error("Repair also failed to parse:", repairParseError);
      throw new Error(`Failed to parse LLM response after repair attempt: ${repairParseError instanceof Error ? repairParseError.message : "Unknown error"}`);
    }
  }
}
