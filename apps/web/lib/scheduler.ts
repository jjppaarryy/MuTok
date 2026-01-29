import cron, { ScheduledTask } from "node-cron";

type SchedulerOptions = {
  enabled: boolean;
  onRun: () => Promise<void>;
  cronExpression?: string;
  windowTimes?: [string, string];
  intervalMinutes?: number;
};

type IntervalTask = { stop: () => void };
export type SchedulerTask = ScheduledTask | IntervalTask;

export function registerScheduler(options: SchedulerOptions): SchedulerTask | null {
  if (!options.enabled) {
    return null;
  }

  if (options.intervalMinutes && options.intervalMinutes > 0) {
    const intervalMs = options.intervalMinutes * 60 * 1000;
    const timer = setInterval(() => {
      void options.onRun().catch((error) => {
        console.error("Interval run failed", error);
      });
    }, intervalMs);
    return {
      stop: () => clearInterval(timer)
    };
  }

  let expression = options.cronExpression ?? "0 9,18 * * *";
  if (options.windowTimes) {
    const [first, second] = options.windowTimes;
    const [h1, m1] = first.split(":").map(Number);
    const [h2, m2] = second.split(":").map(Number);
    expression = `${m1} ${h1},${h2} * * *`;
  }
  const task = cron.schedule(expression, async () => {
    try {
      await options.onRun();
    } catch (error) {
      console.error("Scheduled run failed", error);
    }
  });

  return task;
}
