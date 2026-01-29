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
    stats: z.record(z.unknown()).optional(),
    createdTime: z.string().datetime().optional()
  }))
});

// Asset schemas
export const clipMetadataSchema = z.object({
  category: z.string().min(1, "Category is required"),
  energy: z.number().int().min(1).max(5),
  motion: z.enum(["static", "slow", "moderate", "fast", "intense"]),
  sync: z.enum(["any", "sensitive", "critical"]),
  vibe: z.string().min(1, "Vibe is required")
});

export const snippetSchema = z.object({
  trackId: idSchema,
  startSec: z.number().min(0),
  durationSec: z.number().min(1).max(60),
  energyScore: z.number().min(0).max(1),
  energy: z.number().int().min(1).max(5).optional(),
  section: z.string().optional(),
  vibe: z.string().optional(),
  approved: z.boolean().optional(),
  moment3to7: z.boolean().optional(),
  moment7to11: z.boolean().optional()
});

// Rules/Settings schema (partial, for validation)
export const rulesSchema = z.object({
  target_queue_size: z.number().int().min(1).max(100).optional(),
  cadence_per_day: z.number().int().min(1).max(10).optional(),
  post_time_windows: z.tuple([z.string(), z.string()]).optional(),
  montage: z.object({
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
      const errors = result.error.errors.map(e => ({
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
    const errors = result.error.errors.map(e => ({
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
