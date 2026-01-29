import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { defaultBrainSettings } from "../../../../lib/settings";
import { requireLocalRequest } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const stored = await prisma.setting.findUnique({
      where: { key: "brain" }
    });
    const storedPrompt = (stored?.valueJson as { system_prompt?: string } | undefined)
      ?.system_prompt;
    const legacyPrompt =
      "You are MuTok, a TikTok hook-testing agent focused on music-first clips.";
    const system_prompt =
      typeof storedPrompt === "string" &&
      storedPrompt.trim().length > 0 &&
      storedPrompt.trim() !== legacyPrompt
        ? storedPrompt
        : defaultBrainSettings.system_prompt;
    return NextResponse.json({
      brain: { system_prompt }
    });
  } catch (error) {
    console.error("Failed to get brain settings:", error);
    return NextResponse.json(
      { error: "Failed to get brain settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as { system_prompt?: string };
    
    if (body.system_prompt !== undefined && typeof body.system_prompt !== "string") {
      return NextResponse.json(
        { error: "system_prompt must be a string" },
        { status: 400 }
      );
    }

    const updated = await prisma.setting.upsert({
      where: { key: "brain" },
      update: { valueJson: { system_prompt: body.system_prompt ?? "" } },
      create: { key: "brain", valueJson: { system_prompt: body.system_prompt ?? "" } }
    });
    return NextResponse.json({ brain: updated.valueJson });
  } catch (error) {
    console.error("Failed to update brain settings:", error);
    return NextResponse.json(
      { error: "Failed to update brain settings" },
      { status: 500 }
    );
  }
}
