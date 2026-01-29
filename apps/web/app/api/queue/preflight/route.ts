import { NextRequest, NextResponse } from "next/server";
import { requireLocalRequest } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { scorePost } from "../../../../lib/preflightScoring";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  const postPlanId = request.nextUrl.searchParams.get("postPlanId");
  
  if (!postPlanId) {
    return NextResponse.json({ error: "Missing postPlanId" }, { status: 400 });
  }

  try {
    const plan = await prisma.postPlan.findUnique({
      where: { id: postPlanId }
    });

    if (!plan) {
      return NextResponse.json({ error: "PostPlan not found" }, { status: 404 });
    }

    const clipIds = Array.isArray(plan.clipIds) ? (plan.clipIds as string[]) : [];
    
    const scoreResult = await scorePost({
      id: plan.id,
      onscreenText: plan.onscreenText,
      hookFamily: plan.hookFamily,
      recipeId: plan.recipeId,
      container: plan.container,
      compatibilityScore: plan.compatibilityScore,
      clipIds
    });

    return NextResponse.json(scoreResult);
  } catch (error) {
    console.error("[preflight] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate preflight score" },
      { status: 500 }
    );
  }
}
