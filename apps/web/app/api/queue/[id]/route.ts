import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireLocalRequest } from "../../../../lib/auth";

const VALID_STATUSES = ["DRAFT", "RENDERED", "PENDING", "POSTED", "FAILED"];

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;

    // Validate ID format
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({})) as {
      status?: string;
      renderPath?: string | null;
      tiktokPublishId?: string | null;
    };

    // Validate status if provided
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if plan exists
    const existing = await prisma.postPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post plan not found" }, { status: 404 });
    }

    const updated = await prisma.postPlan.update({
      where: { id },
      data: {
        status: body.status,
        renderPath: body.renderPath ?? undefined,
        tiktokPublishId: body.tiktokPublishId ?? undefined
      }
    });

    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error("Failed to update post plan:", error);
    return NextResponse.json(
      { error: "Failed to update post plan" },
      { status: 500 }
    );
  }
}
