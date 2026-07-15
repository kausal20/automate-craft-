/**
 * 9. Alert Engine — turn observations into severity-ranked alerts.
 *
 * Every alert carries `evidence`: the observation that produced it. An alert
 * with no supporting observation is never emitted.
 *
 * Credential alerts are produced by the credential monitor and merged in by the
 * agent — this module covers execution/performance/liveness alerts.
 */

import type { Alert, ExecutionSummary, NodeStats, PerformanceStats } from "../../models/monitoring";
import { THRESHOLDS, type MonitoringContext } from "../context";
import { consecutiveFailures } from "./failure";
import type { RuntimeObservations } from "./runtime";

export function evaluateAlerts(input: {
  ctx: MonitoringContext;
  summary: ExecutionSummary;
  nodes: NodeStats[];
  performance: PerformanceStats;
  runtime: RuntimeObservations;
  retryRate: number | null;
}): Alert[] {
  const { ctx, summary, nodes, performance, runtime } = input;
  const alerts: Alert[] = [];

  /* ── liveness ──────────────────────────────────────────────── */
  if (!ctx.active) {
    alerts.push({
      code: "WORKFLOW_OFFLINE",
      severity: "CRITICAL",
      message: "The workflow is not active; it cannot run.",
      evidence: ctx.deployment
        ? `Deployment activationStatus is "${ctx.deployment.activationStatus}".`
        : "No active deployment recorded for this session.",
    });
  } else if (summary.total === 0) {
    alerts.push({
      code: "NO_EXECUTIONS",
      severity: "LOW",
      message: "The workflow is active but has never executed.",
      evidence: "Zero execution records observed.",
    });
  }

  /* ── failures ──────────────────────────────────────────────── */
  if (summary.failed >= THRESHOLDS.repeatedFailures) {
    alerts.push({
      code: "REPEATED_FAILURES",
      severity: summary.failed >= THRESHOLDS.repeatedFailures * 2 ? "CRITICAL" : "HIGH",
      message: `${summary.failed} executions failed.`,
      evidence: `${summary.failed} of ${summary.total} observed executions ended in error.`,
    });
  }
  const streak = consecutiveFailures(ctx);
  if (streak >= THRESHOLDS.consecutiveFailures) {
    alerts.push({
      code: "CONSECUTIVE_FAILURES",
      severity: "CRITICAL",
      message: `The last ${streak} executions all failed.`,
      evidence: `${streak} consecutive failed executions, most recent first.`,
    });
  }

  /* ── per-node failures ─────────────────────────────────────── */
  for (const n of nodes) {
    if (n.runs === 0) continue;
    if (n.failures >= THRESHOLDS.repeatedFailures) {
      alerts.push({
        code: "NODE_FAILING",
        severity: "HIGH",
        message: `Node "${n.nodeId}" failed ${n.failures} of ${n.runs} runs.`,
        target: n.nodeId,
        evidence: `Observed success rate ${((n.successRate ?? 0) * 100).toFixed(0)}% over ${n.runs} runs.`,
      });
    }
  }

  /* ── timeouts / api ────────────────────────────────────────── */
  if (runtime.timeoutEvents.length >= THRESHOLDS.repeatedFailures) {
    alerts.push({
      code: "REPEATED_TIMEOUTS",
      severity: "HIGH",
      message: `${runtime.timeoutEvents.length} timeout events observed.`,
      evidence: runtime.timeoutEvents[0].message,
    });
  }
  if (runtime.apiEvents.length >= THRESHOLDS.repeatedFailures) {
    alerts.push({
      code: "API_FAILURES",
      severity: "HIGH",
      message: `${runtime.apiEvents.length} API error events observed.`,
      evidence: runtime.apiEvents[0].message,
    });
  }

  /* ── performance ───────────────────────────────────────────── */
  if (performance.averageRuntimeMs !== null && performance.averageRuntimeMs >= THRESHOLDS.longExecutionMs) {
    alerts.push({
      code: "LONG_EXECUTION",
      severity: "MEDIUM",
      message: `Average execution takes ${performance.averageRuntimeMs}ms.`,
      evidence: `Observed average over ${summary.total} executions exceeds ${THRESHOLDS.longExecutionMs}ms.`,
    });
  }

  /* ── retries ───────────────────────────────────────────────── */
  if (input.retryRate !== null && input.retryRate >= THRESHOLDS.highRetryRate) {
    alerts.push({
      code: "HIGH_RETRY_RATE",
      severity: "MEDIUM",
      message: `${Math.round(input.retryRate * 100)}% of node runs required a retry.`,
      evidence: `Retry rate ${input.retryRate.toFixed(2)} exceeds ${THRESHOLDS.highRetryRate}.`,
    });
  }
  const retriesByNode = new Map<string, number>();
  for (const n of ctx.nodeExecutions) {
    const extra = Math.max(0, n.attempts - 1);
    if (extra > 0) retriesByNode.set(n.nodeId, (retriesByNode.get(n.nodeId) ?? 0) + extra);
  }
  for (const [nodeId, count] of [...retriesByNode].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (count >= THRESHOLDS.retryStorm) {
      alerts.push({
        code: "RETRY_STORM",
        severity: "HIGH",
        message: `Node "${nodeId}" retried ${count} times.`,
        target: nodeId,
        evidence: `Observed ${count} retries on "${nodeId}" (threshold ${THRESHOLDS.retryStorm}).`,
      });
    }
  }

  /* ── loops ─────────────────────────────────────────────────── */
  const perExecution = new Map<string, Map<string, number>>();
  for (const n of ctx.nodeExecutions) {
    if (!perExecution.has(n.executionId)) perExecution.set(n.executionId, new Map());
    const byNode = perExecution.get(n.executionId)!;
    byNode.set(n.nodeId, (byNode.get(n.nodeId) ?? 0) + 1);
  }
  for (const [executionId, byNode] of [...perExecution].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (const [nodeId, runs] of [...byNode].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (runs >= THRESHOLDS.loopRunsPerExecution) {
        alerts.push({
          code: "EXECUTION_LOOP",
          severity: "HIGH",
          message: `Node "${nodeId}" ran ${runs} times in a single execution.`,
          target: nodeId,
          evidence: `Execution ${executionId} recorded ${runs} runs of "${nodeId}".`,
        });
      }
    }
  }

  /* ── webhook inactivity ────────────────────────────────────── */
  // Only meaningful for an active, event-driven workflow that HAS run before.
  const triggerKind = ctx.ir?.core.trigger.kind;
  if (ctx.active && (triggerKind === "webhook" || triggerKind === "form") && summary.lastExecutionAt !== null) {
    const idleMs = ctx.now - summary.lastExecutionAt;
    if (idleMs >= THRESHOLDS.webhookInactivityMs) {
      const hours = Math.round(idleMs / 3_600_000);
      alerts.push({
        code: "WEBHOOK_INACTIVE",
        severity: "MEDIUM",
        message: `No ${triggerKind} executions for ~${hours}h.`,
        evidence: `Last execution at ${new Date(summary.lastExecutionAt).toISOString()}.`,
      });
    }
  }

  /* ── execution spikes ──────────────────────────────────────── */
  if (ctx.executions.length >= THRESHOLDS.spikeMinExecutions) {
    const byHour = new Map<number, number>();
    for (const e of ctx.executions) {
      const hour = Math.floor(e.startedAt / 3_600_000);
      byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
    }
    const counts = [...byHour.values()].sort((a, b) => a - b);
    if (counts.length >= 2) {
      const mid = Math.floor(counts.length / 2);
      const medianRate =
        counts.length % 2 === 0 ? (counts[mid - 1] + counts[mid]) / 2 : counts[mid];
      const peak = counts[counts.length - 1];
      if (medianRate > 0 && peak >= medianRate * THRESHOLDS.spikeMultiplier) {
        alerts.push({
          code: "EXECUTION_SPIKE",
          severity: "MEDIUM",
          message: `Execution spike: peak ${peak}/h vs median ${medianRate}/h.`,
          evidence: `Peak hourly rate is ${(peak / medianRate).toFixed(1)}× the median across ${byHour.size} observed hours.`,
        });
      }
    }
  }

  return alerts;
}
