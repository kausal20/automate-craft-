/**
 * Monitoring Agent models (Phase H).
 *
 * The Monitoring Agent OBSERVES a deployed workflow. It never modifies the IR,
 * never deploys, never optimizes.
 *
 * Honesty rules encoded here:
 *   - Health is derived from REAL execution history only. Zero executions ⇒
 *     UNKNOWN (or OFFLINE when the deployment itself is inactive) — never
 *     HEALTHY. Absence of failures is not evidence of health.
 *   - Every metric traces to an observed record. Nothing is extrapolated.
 *   - Recommendations cite the observation that produced them; a recommendation
 *     with no supporting evidence is not emitted.
 *   - The agent is a pure function of its inputs (history is passed in, not
 *     fetched), so identical history ⇒ identical report.
 */

import type { SupportedIntegration } from "@/lib/workflow";

/* ── Observed inputs (what the runtime actually recorded) ────────── */

export type ExecutionStatus = "success" | "error" | "running" | "cancelled";

/** One workflow run, as recorded by the runtime. */
export interface ExecutionRecord {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms; null while still running. */
  finishedAt: number | null;
  /** Trigger that started it, e.g. "form", "webhook", "schedule", "manual". */
  trigger: string;
  /** Error message when status is "error". */
  error?: string;
}

export type NodeExecutionStatus = "success" | "error" | "skipped";

/** One node within one run. */
export interface NodeExecutionRecord {
  executionId: string;
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt: number;
  finishedAt: number | null;
  /** Total attempts including the first. >1 means retries happened. */
  attempts: number;
  error?: string;
}

export type RuntimeEventLevel = "info" | "warning" | "error";

/** Append-only runtime/log event. */
export interface RuntimeEventRecord {
  id: string;
  executionId: string;
  nodeId?: string;
  /** e.g. "credential.refresh_failed", "webhook.received", "api.error". */
  kind: string;
  level: RuntimeEventLevel;
  message: string;
  at: number;
}

/** Observed credential state at monitoring time — never assumed from deploy. */
export interface CredentialObservation {
  integration: SupportedIntegration;
  status: "connected" | "expired" | "revoked" | "pending";
  /** Epoch ms; null when the provider exposes no expiry. */
  expiresAt?: number | null;
}

/* ── Health ─────────────────────────────────────────────────────── */

/**
 * OFFLINE  — deployment is not active; it cannot run at all.
 * UNKNOWN  — active but no terminal executions yet; health is not assessable.
 *            Reporting HEALTHY here would be a guess.
 * HEALTHY / WARNING / CRITICAL — derived from observed success rate.
 */
export type MonitoringHealth =
  | "HEALTHY"
  | "WARNING"
  | "CRITICAL"
  | "OFFLINE"
  | "UNKNOWN";

/* ── Alerts ─────────────────────────────────────────────────────── */

export type AlertSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AlertCode =
  | "REPEATED_FAILURES"
  | "CONSECUTIVE_FAILURES"
  | "CREDENTIAL_EXPIRED"
  | "CREDENTIAL_EXPIRING"
  | "CREDENTIAL_DISCONNECTED"
  | "OAUTH_FAILURE"
  | "PERMISSION_FAILURE"
  | "TOKEN_REFRESH_FAILURE"
  | "WORKFLOW_OFFLINE"
  | "LONG_EXECUTION"
  | "HIGH_RETRY_RATE"
  | "RETRY_STORM"
  | "WEBHOOK_INACTIVE"
  | "EXECUTION_SPIKE"
  | "EXECUTION_LOOP"
  | "REPEATED_TIMEOUTS"
  | "API_FAILURES"
  | "NODE_FAILING"
  | "NO_EXECUTIONS";

export interface Alert {
  code: AlertCode;
  severity: AlertSeverity;
  message: string;
  /** Node / integration the alert concerns. */
  target?: string;
  /** The observation that triggered it — alerts are never speculative. */
  evidence: string;
}

/* ── Module results ─────────────────────────────────────────────── */

export type MonitoringModule =
  | "execution"
  | "health"
  | "node"
  | "runtime"
  | "retry"
  | "failure"
  | "credential"
  | "performance"
  | "alert"
  | "analytics"
  | "recommendation"
  | "readiness";

export interface ExecutionSummary {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  cancelled: number;
  /** succeeded / (succeeded + failed); null when no terminal runs. */
  successRate: number | null;
  failureRate: number | null;
  firstExecutionAt: number | null;
  lastExecutionAt: number | null;
  /** Per-trigger tallies. */
  byTrigger: Record<string, number>;
}

export interface NodeStats {
  nodeId: string;
  runs: number;
  failures: number;
  retries: number;
  /** null when the node never completed a timed run. */
  averageRuntimeMs: number | null;
  lastRuntimeMs: number | null;
  lastFailureAt: number | null;
  /** successes / runs; null when never ran. */
  successRate: number | null;
}

export interface PerformanceStats {
  averageRuntimeMs: number | null;
  medianRuntimeMs: number | null;
  p95RuntimeMs: number | null;
  p99RuntimeMs: number | null;
  slowestNodeId: string | null;
  fastestNodeId: string | null;
  /** Executions per hour across the observed window; null when < 2 runs. */
  throughputPerHour: number | null;
}

export interface RetryStats {
  totalRetries: number;
  /** Node runs that needed >1 attempt. */
  retriedRuns: number;
  /** Retried runs that ultimately succeeded / retried runs. */
  retrySuccessRate: number | null;
  retryFailureRate: number | null;
  /** Observed error messages that preceded a retry, tallied. */
  reasons: Record<string, number>;
}

export interface FailurePattern {
  kind:
    | "repeated"
    | "timeout"
    | "api"
    | "credential"
    | "webhook"
    | "retry_storm"
    | "loop";
  count: number;
  target?: string;
  evidence: string;
}

export interface Analytics {
  executionCount: number;
  successRate: number | null;
  failureRate: number | null;
  averageRuntimeMs: number | null;
  /** Error message → occurrences. */
  errorDistribution: Record<string, number>;
  retry: RetryStats;
  nodes: NodeStats[];
  performance: PerformanceStats;
}

export interface MonitoringRecommendation {
  message: string;
  /** The observed data that justifies it. Never speculative. */
  evidence: string;
  target?: string;
}

export interface ModuleOutcome {
  module: MonitoringModule;
  /** Observations the module made. 0 ⇒ nothing to report. */
  observations: number;
  note?: string;
}

/* ── Report ─────────────────────────────────────────────────────── */

export interface MonitoringReport {
  sessionId: string;
  workflowId: string | null;
  /** IR revision that is live. */
  revision: number | null;

  health: MonitoringHealth;
  /** 0–100 derived from observed success rate + alerts. null when UNKNOWN. */
  healthScore: number | null;

  execution: ExecutionSummary;
  nodes: NodeStats[];
  performance: PerformanceStats;
  failures: FailurePattern[];
  credentials: CredentialObservation[];
  alerts: Alert[];
  recommendations: MonitoringRecommendation[];
  analytics: Analytics;
  modules: ModuleOutcome[];

  /** Window the observations cover. */
  windowStart: number | null;
  windowEnd: number | null;
  createdAt: number;
}

const ALL_MODULES: MonitoringModule[] = [
  "execution",
  "health",
  "node",
  "runtime",
  "retry",
  "failure",
  "credential",
  "performance",
  "alert",
  "analytics",
  "recommendation",
  "readiness",
];

/** Keep module order stable regardless of execution order. */
export function orderModules(modules: ModuleOutcome[]): ModuleOutcome[] {
  return ALL_MODULES.map((m) => modules.find((x) => x.module === m)).filter(
    (m): m is ModuleOutcome => Boolean(m),
  );
}

/**
 * Derive health from observed history.
 *
 *   deployment inactive        → OFFLINE
 *   no terminal executions     → UNKNOWN  (never HEALTHY — nothing observed)
 *   successRate ≥ 0.95         → HEALTHY
 *   successRate ≥ 0.70         → WARNING
 *   else                       → CRITICAL
 *
 * A CRITICAL alert forces at least WARNING even when the rate looks fine —
 * e.g. an expired credential that has not yet produced a failed run.
 */
export function deriveHealth(input: {
  active: boolean;
  summary: ExecutionSummary;
  alerts: Alert[];
}): MonitoringHealth {
  if (!input.active) return "OFFLINE";

  const terminal = input.summary.succeeded + input.summary.failed;
  if (terminal === 0) return "UNKNOWN";

  const rate = input.summary.succeeded / terminal;
  let health: MonitoringHealth =
    rate >= 0.95 ? "HEALTHY" : rate >= 0.7 ? "WARNING" : "CRITICAL";

  const hasCritical = input.alerts.some((a) => a.severity === "CRITICAL");
  const hasHigh = input.alerts.some((a) => a.severity === "HIGH");
  if (hasCritical) health = "CRITICAL";
  else if (hasHigh && health === "HEALTHY") health = "WARNING";

  return health;
}

/**
 * Health score 0–100. Null when health is not assessable (UNKNOWN).
 * Base is the observed success rate; alerts subtract by severity.
 */
export function deriveHealthScore(input: {
  health: MonitoringHealth;
  summary: ExecutionSummary;
  alerts: Alert[];
}): number | null {
  if (input.health === "UNKNOWN") return null;
  if (input.health === "OFFLINE") return 0;

  const terminal = input.summary.succeeded + input.summary.failed;
  if (terminal === 0) return null;

  const base = (input.summary.succeeded / terminal) * 100;
  const penalty = input.alerts.reduce((sum, a) => {
    switch (a.severity) {
      case "CRITICAL":
        return sum + 25;
      case "HIGH":
        return sum + 15;
      case "MEDIUM":
        return sum + 8;
      case "LOW":
        return sum + 3;
      default:
        return sum;
    }
  }, 0);

  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}
