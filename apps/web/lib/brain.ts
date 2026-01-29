import { fetchWithTimeout, TIMEOUTS } from "./fetchWithTimeout";
import { getConfig } from "./config";
import { systemPrompt, developerPrompt } from "./brainPrompt";

export type BrainInput = {
  settings: Record<string, unknown>;
  clips: Array<Record<string, unknown>>;
  snippets: Array<Record<string, unknown>>;
  metricsSummary: Record<string, unknown>;
  queueState: Record<string, unknown>;
  performance_summary?: Record<string, unknown>;
  hook_recipe_templates?: Array<Record<string, unknown>>;
  voice_bank_top_lines?: string[];
};

export type BrainPost = {
  scheduled_for: string;
  container: string;
  clip_ids: string[];
  track_id: string;
  snippet_id: string;
  onscreen_text: string;
  caption: string;
  hook_family: string;
  confidence: number;
  reasons: string[];
};

export type BrainPlan = {
  run_id: string;
  posts: BrainPost[];
};

type BrainResult = {
  plan: BrainPlan;
  prompt: string;
  responseText: string;
};

export function validateBrainPlan(raw: unknown): BrainPlan {
  const plan = raw as BrainPlan;
  if (!plan.run_id || !Array.isArray(plan.posts)) {
    throw new Error("Invalid brain plan structure");
  }
  return plan;
}

// Structured outputs schema - enforces exact 2 posts with valid structure
const outputSchema = {
  name: "tiktok_post_plan_run",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["run_id", "posts"],
    properties: {
      run_id: { type: "string" },
      posts: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "scheduled_for",
            "container",
            "clip_ids",
            "track_id",
            "snippet_id",
            "onscreen_text",
            "caption",
            "hook_family",
            "confidence",
            "reasons"
          ],
          properties: {
            scheduled_for: { type: "string" },
            container: { type: "string", enum: ["static_daw", "montage"] },
            clip_ids: {
              type: "array",
              minItems: 1,
              items: { type: "string" }
            },
            track_id: { type: "string" },
            snippet_id: { type: "string" },
            onscreen_text: { type: "string" },
            caption: { type: "string" },
            hook_family: {
              type: "string",
              enum: [
                "anti_algo",
                "small_numbers",
                "doomscroll",
                "youre_early",
                "keep_skip",
                "wait_for_it",
                "if_you_like",
                "dj_context",
                "emotional_lift",
                "producer_brain",
                "stakes",
                "open_loop"
              ]
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reasons: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: { type: "string" }
            }
          }
        }
      }
    }
  }
};

export async function runBrain(input: BrainInput): Promise<BrainResult> {
  const apiKey = await getConfig("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Please configure it in Settings.");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const userContent = JSON.stringify(input, null, 2);

  // Combine system + developer prompts (developer role not available in chat completions)
  const fullSystemPrompt = `${systemPrompt}\n\n---\n\nOPERATING PROCEDURE:\n${developerPrompt}`;

  console.log("[brain] Calling OpenAI with structured outputs...");

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
          { role: "system", content: fullSystemPrompt },
          { role: "user", content: `Input data:\n${userContent}` }
        ],
        temperature: 0.7,
        response_format: {
          type: "json_schema",
          json_schema: outputSchema
        }
      })
    },
    TIMEOUTS.VERY_LONG // 5 minutes for structured outputs
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${text}`);
  }

  const raw = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const responseText = raw.choices?.[0]?.message?.content ?? "";

  console.log("[brain] Response received, parsing...");

  let parsed: BrainPlan;
  try {
    parsed = JSON.parse(responseText);
  } catch (parseError) {
    console.error("[brain] Failed to parse JSON:", parseError);
    throw new Error(`Failed to parse brain response: ${parseError instanceof Error ? parseError.message : "Unknown"}`);
  }

  return {
    plan: parsed,
    prompt: fullSystemPrompt + "\n\n" + userContent,
    responseText
  };
}
