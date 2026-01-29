import { z } from "zod";

export const postPlanSchema = z.object({
  scheduled_for: z.string(),
  container: z.enum(["static_daw", "montage"]),
  clip_ids: z.array(z.string()),
  track_id: z.string(),
  snippet_id: z.string(),
  onscreen_text: z.string().max(120),
  caption: z.string(),
  hook_family: z.string(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string())
});

export const brainSchema = z.object({
  run_id: z.string(),
  posts: z.array(postPlanSchema)
});

export type BrainPlan = z.infer<typeof brainSchema>;
