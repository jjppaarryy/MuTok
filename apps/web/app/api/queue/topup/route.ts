import { NextRequest, NextResponse } from "next/server";
import { getDraftCount, getPendingShareCount24h, canUploadMore } from "../../../../lib/queue";
import { buildPlans } from "../../../../lib/planner";
import { getRulesSettings } from "../../../../lib/settings";
import { requireLocalRequest } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({})) as {
      limit?: number;
      dryRun?: boolean;
    };

    // Validate limit if provided
    if (body.limit !== undefined) {
      if (typeof body.limit !== "number" || body.limit < 1 || body.limit > 100) {
        return NextResponse.json(
          { error: "limit must be a number between 1 and 100" },
          { status: 400 }
        );
      }
    }

    const draftCount = await getDraftCount();
    const pendingCount = await getPendingShareCount24h();
    const rules = await getRulesSettings();

    if (!canUploadMore(pendingCount)) {
      return NextResponse.json(
        { 
          warning: "Pending share cap reached. Uploads paused.",
          pendingCount,
          canUpload: false
        },
        { status: 429 }
      );
    }

    if (draftCount >= rules.target_queue_size) {
      return NextResponse.json({ 
        status: "Queue already at target",
        draftCount,
        targetSize: rules.target_queue_size
      });
    }

    const needed = body.limit ?? rules.target_queue_size - draftCount;
    const result = await buildPlans(needed);

    if (body.dryRun) {
      return NextResponse.json({
        created: result.createdIds,
        warnings: result.warnings,
        dryRun: true
      });
    }

    return NextResponse.json({
      created: result.createdIds,
      warnings: result.warnings,
      count: result.createdIds.length
    });
  } catch (error) {
    console.error("Failed to top up queue:", error);
    return NextResponse.json(
      { error: "Failed to top up queue" },
      { status: 500 }
    );
  }
}
