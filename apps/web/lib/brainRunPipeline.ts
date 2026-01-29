import { runBrain } from "./brain";
import { loadBrainContext } from "./brainRunContext";
import { buildBrainPayload } from "./brainRunPayload";
import { processBrainPlan } from "./brainRunProcessor";

type BrainRunResponse = {
  plan: unknown;
  created: string[];
  skipped: Array<{ reason: string; post: string }>;
};

export async function runBrainPipeline(): Promise<BrainRunResponse> {
  const context = await loadBrainContext();
  const { payload, systemPrompt } = await buildBrainPayload(context);
  const result = await runBrain(payload, systemPrompt);
  const { created, skipped } = await processBrainPlan(
    context,
    result.plan,
    result.prompt,
    result.responseText
  );
  return { plan: result.plan, created, skipped };
}
