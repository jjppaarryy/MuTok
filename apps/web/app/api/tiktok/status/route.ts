import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireLocalRequest } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const auth = await prisma.tikTokAuth.findFirst();
    if (!auth) {
      return NextResponse.json({ connected: false });
    }

    const isExpired = new Date(auth.expiresAt) < new Date();

    return NextResponse.json({
      connected: true,
      scopes: auth.scopes,
      openId: auth.openId,
      expiresAt: auth.expiresAt,
      isExpired
    });
  } catch (error) {
    console.error("Failed to get TikTok status:", error);
    return NextResponse.json(
      { error: "Failed to get TikTok connection status" },
      { status: 500 }
    );
  }
}
