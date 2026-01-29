import { NextRequest, NextResponse } from "next/server";
import { renderPostPlan } from "../../../lib/render";
import { requireLocalRequest } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({})) as { postPlanId?: string };

    if (!body.postPlanId) {
      return NextResponse.json({ error: "Missing postPlanId" }, { status: 400 });
    }

    // Validate ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(body.postPlanId)) {
      return NextResponse.json({ error: "Invalid postPlanId format" }, { status: 400 });
    }

    const result = await renderPostPlan(body.postPlanId);
    return NextResponse.json({ status: "RENDERED", outputPath: result.outputPath });
  } catch (error) {
    console.error("Render failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Render failed" },
      { status: 500 }
    );
  }
}
