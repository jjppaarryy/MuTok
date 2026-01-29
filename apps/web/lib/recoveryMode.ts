import { DateTime } from "luxon";
import { prisma } from "./prisma";
import type { RulesSettings } from "./rulesConfig";

type RecoveryStatus = {
  active: boolean;
  viewsDrop: number;
  view2sDrop: number;
  spamErrors: number;
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

export async function getRecoveryStatus(rules: RulesSettings): Promise<RecoveryStatus> {
  if (!rules.recovery_mode.enabled) {
    return { active: false, viewsDrop: 0, view2sDrop: 0, spamErrors: 0 };
  }

  const now = DateTime.local();
  const currentStart = now.minus({ days: 3 }).toJSDate();
  const previousStart = now.minus({ days: 10 }).toJSDate();

  const metrics = await prisma.metric.findMany({
    where: { createTime: { gte: previousStart } },
    select: { createTime: true, views: true, view2Rate: true }
  });

  const current = metrics.filter((metric) => metric.createTime >= currentStart);
  const previous = metrics.filter((metric) => metric.createTime < currentStart);

  const currentViews = median(current.map((metric) => metric.views));
  const previousViews = median(previous.map((metric) => metric.views));
  const currentView2s = median(
    current.map((metric) => metric.view2Rate ?? 0).filter((value) => value > 0)
  );
  const previousView2s = median(
    previous.map((metric) => metric.view2Rate ?? 0).filter((value) => value > 0)
  );

  const viewsDrop =
    previousViews > 0 ? Math.max(0, 1 - currentViews / previousViews) : 0;
  const view2sDrop =
    previousView2s > 0 ? Math.max(0, 1 - currentView2s / previousView2s) : 0;

  const spamErrors = await prisma.runLog.count({
    where: {
      runType: "upload_spam_risk",
      startedAt: { gte: currentStart }
    }
  });

  const active =
    viewsDrop > rules.recovery_mode.views_drop_threshold ||
    view2sDrop > rules.recovery_mode.view2s_drop_threshold ||
    spamErrors >= rules.recovery_mode.spam_error_threshold;

  return { active, viewsDrop, view2sDrop, spamErrors };
}
