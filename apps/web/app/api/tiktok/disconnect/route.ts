import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireLocalRequest } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    await prisma.tikTokAuth.deleteMany();
    return NextResponse.json({ connected: false, message: "Successfully disconnected from TikTok" });
  } catch (error) {
    console.error("Failed to disconnect TikTok:", error);
    return NextResponse.json(
      { error: "Failed to disconnect TikTok account" },
      { status: 500 }
    );
  }
}
