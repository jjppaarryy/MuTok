import { z } from "zod";
import { NextResponse } from "next/server";

// Common ID validation
export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, "Invalid ID format");

// Post plan status
export const postPlanStatusSchema = z.enum([
  "DRAFT",
  "PLANNED", 
  "RENDERED",
  "PENDING",
  "POSTED",
  "FAILED"
]);

// TikTok visibility
export const visibilitySchema = z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]);

// Queue schemas
export const queueDeleteSchema = z.object({
  postPlanId: idSchema
});

export const queuePatchSchema = z.object({
  status: postPlanStatusSchema.optional(),
  renderPath: z.string().nullable().optional(),
  tiktokPublishId: z.string().nullable().optional()
});

export const queueTopupSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  dryRun: z.boolean().optional()
});

export const markPostedSchema = z.object({
  postPlanId: idSchema,
  tiktokVideoId: z.string().optional()
});

// Render schemas
export const renderSchema = z.object({
  postPlanId: idSchema
});

export const renderPendingSchema = z.object({
  limit: z.number().int().min(1).max(50).optional()
});

// TikTok settings
export const tiktokSettingsSchema = z.object({
  sandbox: z.boolean().optional(),
  export_defaults: z.object({
    caption: z.string().optional(),
    visibility: visibilitySchema.optional(),
    allowComment: z.boolean().optional(),
    allowDuet: z.boolean().optional(),
    allowStitch: z.boolean().optional(),
    brandedContent: z.boolean().optional(),
    promoteYourself: z.boolean().optional()
  }).optional()
});

// Brain settings
export const brainSettingsSchema = z.object({
  system_prompt: z.string().optional()
});

// Environment variables
export const envSchema = z.object({
  TIKTOK_CLIENT_ID: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_REDIRECT_URI: z.string().url().optional().or(z.literal("")),
  OPENAI_API_KEY: z.string().optional()
});

// Inspo import schema
export const inspoImportSchema = z.object({
  items: z.array(z.object({
    source: z.string(),
    sourceId: z.string().optional(),
    title: z.string().optional(),
    contentType: z.string().optional(),
    assetType: z.string().optional(),
    linkOriginal: z.string().url().optional().or(z.literal("")),
    copyRewrite: z.string().optional(),
    whyItWorks: z.string().optional(),
    description: z.string().optional(),
    howToUse: z.string().optional(),
    themeTags: z.array(z.string()).optional(),
    purposeTags: z.array(z.string()).optional(),
    genreTags: z.array(z.string()).optional(),
    hashtags: z.array(z.string()).optional(),
    stats: z.record(z.string(), z.unknown()).optional(),
    createdTime: z.string().datetime().optional()
  }))
});

// Asset schemas
export const clipMetadataSchema = z.object({
  category: z.string().min(1, "Category is required"),
  sync: z.enum(["safe", "sensitive", "critical"])
});

export const snippetSchema = z.object({
  trackId: idSchema,
  startSec: z.number().min(0),
  durationSec: z.number().min(1).max(60),
  energyScore: z.number().min(0).max(1),
  section: z.string().optional(),
  approved: z.boolean().optional(),
  moment3to7: z.boolean().optional(),
  moment7to11: z.boolean().optional()
});

// Rules/Settings schema (partial, for validation)
export const rulesSchema = z.object({
  target_queue_size: z.number().int().min(1).max(100).optional(),
  cadence_per_day: z.number().int().min(1).max(10).optional(),
  post_time_windows: z.array(z.string()).min(1).optional(),
  voice_profile: z.string().optional(),
  voice_banned_words: z.array(z.string()).optional(),
  voice_examples_limit: z.number().int().min(0).max(200).optional(),
  spam_guardrails: z.object({
    pending_drafts_cap: z.number().int().min(1).max(10).optional(),
    daily_draft_upload_cap: z.number().int().min(1).max(10).optional(),
    min_gap_hours: z.number().min(1).max(24).optional(),
    window_jitter_minutes: z.number().int().min(0).max(90).optional(),
    recipe_cooldown_days: z.number().int().min(1).max(30).optional(),
    beat1_exact_cooldown_days: z.number().int().min(1).max(30).optional(),
    beat2_exact_cooldown_days: z.number().int().min(1).max(30).optional(),
    caption_exact_cooldown_days: z.number().int().min(1).max(30).optional(),
    beat1_prefix_words: z.number().int().min(1).max(6).optional(),
    beat1_prefix_cooldown_days: z.number().int().min(1).max(30).optional(),
    snippet_cooldown_hours: z.number().int().min(1).max(168).optional(),
    track_cooldown_hours: z.number().int().min(1).max(168).optional(),
    clip_cooldown_hours: z.number().int().min(1).max(168).optional(),
    montage_template_cooldown_hours: z.number().int().min(1).max(168).optional(),
    max_hook_family_per_day: z.number().int().min(1).max(10).optional(),
    max_hook_family_per_week: z.number().int().min(1).max(20).optional(),
    max_anti_algo_per_week: z.number().int().min(0).max(20).optional(),
    max_comment_cta_per_day: z.number().int().min(0).max(10).optional(),
    max_same_cta_intent_in_row: z.number().int().min(1).max(10).optional(),
    max_snippet_style_per_day: z.number().int().min(1).max(10).optional(),
    hashtag_count_min: z.number().int().min(0).max(10).optional(),
    hashtag_count_max: z.number().int().min(1).max(20).optional(),
    retire_score_threshold: z.number().min(0).max(1).optional(),
    retire_min_posts: z.number().int().min(1).max(20).optional()
  }).optional(),
  recovery_mode: z.object({
    enabled: z.boolean().optional(),
    days: z.number().int().min(1).max(30).optional(),
    views_drop_threshold: z.number().min(0).max(1).optional(),
    view2s_drop_threshold: z.number().min(0).max(1).optional(),
    spam_error_threshold: z.number().int().min(0).max(10).optional(),
    cadence_per_day: z.number().int().min(1).max(5).optional(),
    allow_montage: z.boolean().optional(),
    allow_comment_cta: z.boolean().optional(),
    hashtag_max: z.number().int().min(1).max(10).optional()
  }).optional(),
  montage: z.object({
    clip_count: z.number().int().min(1).max(100).optional(),
    clip_count_min: z.number().int().min(1).max(100).optional(),
    clip_count_max: z.number().int().min(1).max(100).optional(),
    clip_duration_range: z.tuple([z.number(), z.number()]).optional()
  }).optional(),
  viral_engine: z.object({
    require_montage_first_cut: z.boolean().optional(),
    require_hook_text: z.boolean().optional()
  }).optional(),
  optimiser_policy: z.object({
    autopilot_enabled: z.boolean().optional(),
    autopilot_interval_hours: z.number().min(0.083).max(24).optional() // Min 5 min
  }).optional()
}).passthrough(); // Allow additional fields

/**
 * Validates request body against a Zod schema
 * Returns parsed data on success, or NextResponse error on failure
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message
      }));
      
      return {
        error: NextResponse.json(
          { 
            error: "Validation failed",
            details: errors
          },
          { status: 400 }
        )
      };
    }
    
    return { data: result.data };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    };
  }
}

/**
 * Validates URL params against a Zod schema
 */
export function validateParams<T>(
  params: Record<string, string | undefined>,
  schema: z.ZodSchema<T>
): { data: T } | { error: NextResponse } {
  const result = schema.safeParse(params);
  
  if (!result.success) {
    const errors = result.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message
    }));
    
    return {
      error: NextResponse.json(
        { 
          error: "Invalid parameters",
          details: errors
        },
        { status: 400 }
      )
    };
  }
  
  return { data: result.data };
}
