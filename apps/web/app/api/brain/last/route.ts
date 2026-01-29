import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireLocalRequest } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const last = await prisma.runLog.findFirst({
      where: { runType: "brain_run" },
      orderBy: { startedAt: "desc" }
    });
    return NextResponse.json({
      lastPrompt: last?.payloadExcerpt ?? "",
      lastResponse: last?.error ?? "",
      status: last?.status ?? null,
      startedAt: last?.startedAt ?? null,
      finishedAt: last?.finishedAt ?? null
    });
  } catch (error) {
    console.error("Failed to get last brain run:", error);
    return NextResponse.json(
      { error: "Failed to get last brain run" },
      { status: 500 }
    );
  }
}
