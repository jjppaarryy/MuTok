import { NextRequest, NextResponse } from "next/server";
import { stopScheduler } from "../../../../lib/schedulerState";
import { requireLocalRequest } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const result = stopScheduler();
    return NextResponse.json({ running: false, success: result.success });
  } catch (error) {
    console.error("Failed to stop scheduler:", error);
    return NextResponse.json(
      { error: "Failed to stop scheduler" },
      { status: 500 }
    );
  }
}
