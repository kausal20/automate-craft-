/**
 * Monitoring Agent models.
 *
 * The monitoring agent (Phase G) activates AFTER a real deployment. It
 * aggregates execution records (from `automation_runs` / `step_executions`
 * — already persisted by the runtime) into health summaries. It computes
 * nothing fictional: every metric derives from stored run rows.
 *
 * If there are zero runs, health is "unknown" — never "healthy". The
 * agent does not invent execution history.
 */

export type HealthStatus = "unknown" | "healthy" | "degraded" | "failing";

export interface ExecutionReport {
  automationId: string;
  /** Counts derived from automation_runs rows. */
  executionCount: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  /** Milliseconds, averaged over completed runs. */
  averageDurationMs: number | null;
  /** ISO timestamp of the most recent run, or null when none. */
  lastExecutionAt: string | null;
  /** Per-integration failure tallies, derived from step_executions. */
  integrationFailures: Record<string, number>;
  /** Runs that failed specifically due to credential/connection errors. */
  credentialFailures: number;
}

export interface MonitoringSummary {
  automationId: string;
  health: HealthStatus;
  /** success / (success + failure); null when no terminal runs. */
  successRate: number | null;
  report: ExecutionReport;
  /** Forward-looking, non-fabricated suggestions (e.g. "enable retries"). */
  recommendations: string[];
  createdAt: number;
}

/**
 * Derive health from an execution report. Deterministic thresholds:
 *   - no runs            → unknown
 *   - successRate ≥ 0.95 → healthy
 *   - successRate ≥ 0.70 → degraded
 *   - else               → failing
 */
export function deriveHealth(report: ExecutionReport): HealthStatus {
  const terminal = report.successCount + report.failureCount;
  if (terminal === 0) return "unknown";
  const rate = report.successCount / terminal;
  if (rate >= 0.95) return "healthy";
  if (rate >= 0.7) return "degraded";
  return "failing";
}

export function successRate(report: ExecutionReport): number | null {
  const terminal = report.successCount + report.failureCount;
  if (terminal === 0) return null;
  return report.successCount / terminal;
}
