import { NextRequest, NextResponse } from "next/server";
import { getSchedulerStatus } from "../../../../lib/schedulerState";
import { requireLocalRequest } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    return NextResponse.json(getSchedulerStatus());
  } catch (error) {
    console.error("Failed to get scheduler status:", error);
    return NextResponse.json(
      { error: "Failed to get scheduler status" },
      { status: 500 }
    );
  }
}
