import type { SchedulerTask } from "./scheduler";
import { registerScheduler } from "./scheduler";
import { runAutopilotCycle, runScheduledCycle } from "./worker";
import { getRulesSettings } from "./settings";

type SchedulerState = {
  task: SchedulerTask | null;
  running: boolean;
  starting: boolean;
  mode: "window" | "continuous" | null;
  lastRunAt?: string | null;
  lastError?: string | null;
};

const globalState = globalThis as unknown as {
  schedulerState?: SchedulerState;
};

const state: SchedulerState =
  globalState.schedulerState ?? { 
    task: null, 
    running: false, 
    starting: false,
    mode: null, 
    lastRunAt: null 
  };

if (!globalState.schedulerState) {
  globalState.schedulerState = state;
}

/**
 * Starts the scheduler with proper async handling and concurrency protection.
 * Returns a promise that resolves when the scheduler is fully started.
 */
export async function startScheduler(): Promise<{ success: boolean; error?: string }> {
  // Prevent concurrent start calls
  if (state.starting) {
    return { success: false, error: "Scheduler is already starting" };
  }

  // Stop any existing task first
  if (state.task) {
    state.task.stop();
    state.task = null;
  }

  state.starting = true;

  try {
    const rules = await getRulesSettings();

    const runWithStatus = async (fn: () => Promise<unknown>) => {
      state.lastRunAt = new Date().toISOString();
      try {
        await fn();
        state.lastError = null;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Scheduler run failed";
        state.lastError = message;
        console.error("Scheduler run error:", error);
      }
    };

    const autopilot = rules.optimiser_policy.autopilot_enabled;
    // Allow sub-hour intervals (minimum 5 minutes)
    const intervalMinutes = Math.max(5, rules.optimiser_policy.autopilot_interval_hours * 60);
    
    state.task = registerScheduler({
      enabled: true,
      onRun: autopilot
        ? () => runWithStatus(runAutopilotCycle)
        : () => runWithStatus(runScheduledCycle),
      windowTimes: autopilot ? undefined : rules.post_time_windows,
      intervalMinutes: autopilot ? intervalMinutes : undefined
    });
    
    state.mode = autopilot ? "continuous" : "window";
    state.running = true;
    state.starting = false;

    // Run immediately if in autopilot mode
    if (autopilot) {
      // Don't await - let it run in background
      runWithStatus(runAutopilotCycle).catch((error) => {
        console.error("Initial autopilot run failed:", error);
      });
    }

    return { success: true };
  } catch (error) {
    state.starting = false;
    state.running = false;
    const message = error instanceof Error ? error.message : "Failed to start scheduler";
    state.lastError = message;
    console.error("Failed to start scheduler:", error);
    return { success: false, error: message };
  }
}

export function stopScheduler(): { success: boolean } {
  if (state.task) {
    state.task.stop();
    state.task = null;
  }
  state.running = false;
  state.starting = false;
  state.mode = null;
  return { success: true };
}

export function getSchedulerStatus() {
  return {
    running: state.running,
    starting: state.starting,
    hasTask: Boolean(state.task),
    mode: state.mode,
    lastRunAt: state.lastRunAt,
    lastError: state.lastError
  };
}
