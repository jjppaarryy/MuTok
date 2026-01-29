import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { defaultRules } from "../../../lib/rulesConfig";
import { requireLocalRequest } from "../../../lib/auth";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const stored = await prisma.setting.findUnique({
      where: { key: "rules" }
    });
    return NextResponse.json({
      rules: stored?.valueJson ?? defaultRules
    });
  } catch (error) {
    console.error("Failed to get settings:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const updated = await prisma.setting.upsert({
      where: { key: "rules" },
      update: { valueJson: body as Prisma.InputJsonValue },
      create: { key: "rules", valueJson: body as Prisma.InputJsonValue }
    });

    return NextResponse.json({ rules: updated.valueJson });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
