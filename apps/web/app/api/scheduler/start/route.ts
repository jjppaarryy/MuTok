import { NextRequest, NextResponse } from "next/server";
import { startScheduler } from "../../../../lib/schedulerState";
import { requireLocalRequest } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const result = await startScheduler();
    
    if (!result.success) {
      return NextResponse.json(
        { running: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ running: true });
  } catch (error) {
    console.error("Failed to start scheduler:", error);
    return NextResponse.json(
      { running: false, error: "Failed to start scheduler" },
      { status: 500 }
    );
  }
}
