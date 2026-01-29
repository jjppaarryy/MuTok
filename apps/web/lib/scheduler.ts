import cron, { ScheduledTask } from "node-cron";

type SchedulerOptions = {
  enabled: boolean;
  onRun: () => Promise<void>;
  cronExpression?: string;
  windowTimes?: string[];
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

  if (options.windowTimes && options.windowTimes.length > 0) {
    const tasks = options.windowTimes.map((time) => {
      const [start] = time.split("-");
      const [hour, minute] = start.split(":").map(Number);
      const expression = `${minute} ${hour} * * *`;
      return cron.schedule(expression, async () => {
        try {
          await options.onRun();
        } catch (error) {
          console.error("Scheduled run failed", error);
        }
      });
    });
    return {
      stop: () => tasks.forEach((task) => task.stop())
    };
  }

  const expression = options.cronExpression ?? "0 9,18 * * *";
  const task = cron.schedule(expression, async () => {
    try {
      await options.onRun();
    } catch (error) {
      console.error("Scheduled run failed", error);
    }
  });
  return task;
}
