import { NextRequest, NextResponse } from "next/server";
import { runScheduledCycle } from "../../../../lib/worker";
import { requireLocalRequest } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const authError = requireLocalRequest(request);
  if (authError) return authError;

  try {
    const summary = await runScheduledCycle();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline run failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
