/**
 * Watchdog health evaluation — PURE. No I/O, no clock: `now` is passed in.
 * Same input always gives the same verdict, so it is easy to test.
 */

export type HealthStatus = "ok" | "warn" | "broken";

export type ReasonCode =
  | "app_disconnected"
  | "repeated_failures"
  | "no_activity_24h";

export interface HealthRun {
  status: "running" | "success" | "error";
  /** ISO timestamp. */
  createdAt: string;
}

export interface HealthInput {
  automationId: string;
  automationStatus: "active" | "paused";
  /** ISO timestamp. */
  automationCreatedAt: string;
  /** Integration key -> state, from automations.integration_status. */
  integrationStatus: Record<string, "connected" | "disconnected">;
  /** Newest first. */
  recentRuns: readonly HealthRun[];
  now: number;
}

export interface HealthVerdict {
  status: HealthStatus;
  reason: ReasonCode | null;
  detail: Record<string, unknown>;
}

export const WATCHDOG_THRESHOLDS = {
  /** This many failed runs in a row => broken. */
  consecutiveFailures: 3,
  /** No run for this long on an active automation => warn. */
  inactivityMs: 24 * 60 * 60 * 1000,
  /** Do not call a brand-new automation "inactive". */
  gracePeriodMs: 24 * 60 * 60 * 1000,
} as const;

export function evaluateAutomationHealth(input: HealthInput): HealthVerdict {
  // Paused on purpose: nothing to watch.
  if (input.automationStatus !== "active") {
    return { status: "ok", reason: null, detail: { skipped: "paused" } };
  }

  // 1. A connected app was disconnected / expired.
  const disconnected = Object.entries(input.integrationStatus)
    .filter(([, state]) => state === "disconnected")
    .map(([name]) => name);
  if (disconnected.length > 0) {
    return { status: "broken", reason: "app_disconnected", detail: { apps: disconnected } };
  }

  // 2. Last N finished runs all failed.
  const finished = input.recentRuns.filter((r) => r.status !== "running");
  const lastN = finished.slice(0, WATCHDOG_THRESHOLDS.consecutiveFailures);
  if (
    lastN.length === WATCHDOG_THRESHOLDS.consecutiveFailures &&
    lastN.every((r) => r.status === "error")
  ) {
    return {
      status: "broken",
      reason: "repeated_failures",
      detail: { failures: lastN.length, lastFailureAt: lastN[0].createdAt },
    };
  }

  // 3. Zero activity for 24h on an active automation is an alert, not a quiet day.
  const ageMs = input.now - Date.parse(input.automationCreatedAt);
  if (ageMs >= WATCHDOG_THRESHOLDS.gracePeriodMs) {
    const newest = input.recentRuns[0];
    const sinceMs = newest ? input.now - Date.parse(newest.createdAt) : Infinity;
    if (sinceMs >= WATCHDOG_THRESHOLDS.inactivityMs) {
      return {
        status: "warn",
        reason: "no_activity_24h",
        detail: { lastRunAt: newest?.createdAt ?? null },
      };
    }
  }

  return { status: "ok", reason: null, detail: {} };
}
