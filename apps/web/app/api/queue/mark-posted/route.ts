import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireLocalRequest } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({})) as {
      postPlanId?: string;
      tiktokVideoId?: string;
    };

    if (!body.postPlanId) {
      return NextResponse.json({ error: "Missing postPlanId" }, { status: 400 });
    }

    // Validate ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(body.postPlanId)) {
      return NextResponse.json({ error: "Invalid postPlanId format" }, { status: 400 });
    }

    // Check if plan exists
    const existing = await prisma.postPlan.findUnique({
      where: { id: body.postPlanId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Post plan not found" }, { status: 404 });
    }

    await prisma.postPlan.update({
      where: { id: body.postPlanId },
      data: { status: "POSTED" }
    });

    if (body.tiktokVideoId) {
      await prisma.metric.create({
        data: {
          postPlanId: body.postPlanId,
          tiktokVideoId: body.tiktokVideoId,
          createTime: new Date(),
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0
        }
      });
    }

    return NextResponse.json({ status: "POSTED" });
  } catch (error) {
    console.error("Failed to mark post as posted:", error);
    return NextResponse.json(
      { error: "Failed to mark post as posted" },
      { status: 500 }
    );
  }
}
