import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireLocalRequest } from "../../../lib/auth";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const plans = await prisma.postPlan.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const clipIds = plans.flatMap((plan) => (plan.clipIds as string[]));
    const recipeIds = plans.map((plan) => plan.recipeId).filter(Boolean) as string[];
    const clips = await prisma.clip.findMany({
      where: { id: { in: clipIds } }
    });
    const recipes = await prisma.hookRecipe.findMany({
      where: { id: { in: recipeIds } },
      select: { id: true, name: true }
    });

    const clipMap = new Map(clips.map((clip) => [clip.id, clip]));
    const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe.name]));

    const data = plans.map((plan) => {
      const clipRefs = (plan.clipIds as string[])
        .map((id) => clipMap.get(id))
        .filter(Boolean);
      return {
        ...plan,
        clips: clipRefs,
        recipeName: plan.recipeId ? recipeMap.get(plan.recipeId) ?? null : null,
        hasSensitiveClip: (plan.clipIds as string[]).some((id) => {
          const clip = clipMap.get(id);
          return clip?.sync === "sensitive";
        }),
        hasCriticalClip: (plan.clipIds as string[]).some((id) => {
          const clip = clipMap.get(id);
          return clip?.sync === "critical";
        }),
        clipCategories: clipRefs.map((clip) => clip?.category).filter(Boolean)
      };
    });

    return NextResponse.json({ plans: data });
  } catch (error) {
    console.error("Failed to get queue:", error);
    return NextResponse.json(
      { error: "Failed to get queue" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Check if plan exists before deleting
    const existing = await prisma.postPlan.findUnique({
      where: { id: body.postPlanId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Post plan not found" }, { status: 404 });
    }

    await prisma.postPlan.delete({ where: { id: body.postPlanId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete post plan:", error);
    return NextResponse.json(
      { error: "Failed to delete post plan" },
      { status: 500 }
    );
  }
}
