import { NextResponse } from "next/server";
import { logRunError } from "../../../../lib/logs";
import { prisma } from "../../../../lib/prisma";
import { runMetricsRefresh } from "../../../../lib/metricsRefresh";

export async function POST() {
  try {
    const postedCount = await prisma.postPlan.count({
      where: { status: "POSTED" }
    });
    if (postedCount === 0) {
      return NextResponse.json({
        matched: 0,
        results: [],
        warning: "No posted videos yet."
      });
    }
    const results = await runMetricsRefresh();
    if (results.matched === 0) {
      return NextResponse.json({ matched: 0, results: [] });
    }
    return NextResponse.json(results);
  } catch (error) {
    await logRunError({
      runType: "metrics_refresh",
      error: error instanceof Error ? error.message : "Metrics refresh failed"
    });
    return NextResponse.json(
      { error: "Metrics refresh failed" },
      { status: 500 }
    );
  }
}
