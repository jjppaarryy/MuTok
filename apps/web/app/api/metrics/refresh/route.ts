import { NextResponse } from "next/server";
import { logRunError } from "../../../../lib/logs";
import { prisma } from "../../../../lib/prisma";
import { runMetricsRefresh } from "../../../../lib/metricsRefresh";

export async function POST() {
  try {
    const eligibleCount = await prisma.postPlan.count({
      where: { status: { in: ["POSTED", "UPLOADED_DRAFT", "METRICS_FETCHED"] } }
    });
    if (eligibleCount === 0) {
      return NextResponse.json({
        matched: 0,
        results: [],
        warning: "No uploaded or posted videos yet."
      });
    }
    const results = await runMetricsRefresh();
    if (results.matched === 0) {
      return NextResponse.json({ matched: 0, results: [], debug: results.debug ?? null });
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
