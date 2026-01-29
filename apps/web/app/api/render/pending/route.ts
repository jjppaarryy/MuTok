import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { renderPostPlan } from "../../../../lib/render";
import { getRulesSettings } from "../../../../lib/settings";
import { getPendingShareCount24h, canUploadMore } from "../../../../lib/queue";
import { logRunError } from "../../../../lib/logs";
import { requireLocalRequest } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({})) as { limit?: number };

    // Validate limit if provided
    if (body.limit !== undefined) {
      if (typeof body.limit !== "number" || body.limit < 1 || body.limit > 50) {
        return NextResponse.json(
          { error: "limit must be a number between 1 and 50" },
          { status: 400 }
        );
      }
    }

    const rules = await getRulesSettings();
    const pendingCount = await getPendingShareCount24h();
    if (!canUploadMore(pendingCount)) {
      return NextResponse.json(
        { 
          warning: "Pending share cap reached. Rendering paused.",
          pendingCount,
          canRender: false
        },
        { status: 429 }
      );
    }

    const availableSlots = Math.max(0, 5 - pendingCount);
    const limit = Math.min(body.limit ?? rules.cadence_per_day, availableSlots || 1);
    const plans = await prisma.postPlan.findMany({
      where: { status: "PLANNED" },
      orderBy: { createdAt: "asc" },
      take: limit
    });

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const plan of plans) {
      try {
        await renderPostPlan(plan.id);
        results.push({ id: plan.id, status: "RENDERED" });
      } catch (error) {
        console.error(`Failed to render plan ${plan.id}:`, error);
        results.push({
          id: plan.id,
          status: "FAILED",
          error: error instanceof Error ? error.message : "Render failed"
        });
      }
    }

    return NextResponse.json({ 
      results,
      total: plans.length,
      successful: results.filter(r => r.status === "RENDERED").length,
      failed: results.filter(r => r.status === "FAILED").length
    });
  } catch (error) {
    console.error("Render batch failed:", error);
    await logRunError({
      runType: "render_batch",
      error: error instanceof Error ? error.message : "Render batch failed"
    });
    return NextResponse.json({ error: "Render batch failed" }, { status: 500 });
  }
}
