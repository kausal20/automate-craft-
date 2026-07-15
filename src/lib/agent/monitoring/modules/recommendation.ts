/**
 * 11. Recommendation Engine.
 *
 * Recommendations are generated ONLY from observed runtime data. Every one
 * carries the evidence that produced it — if there is no observation, there is
 * no recommendation. The engine never speculates about workflows it has no data
 * for, and it never modifies anything (Phase I owns optimization).
 */

import type {
  Alert,
  ExecutionSummary,
  MonitoringRecommendation,
  NodeStats,
  PerformanceStats,
  RetryStats,
} from "../../models/monitoring";
import { THRESHOLDS, type MonitoringContext } from "../context";
import type { RuntimeObservations } from "./runtime";

export function buildRecommendations(input: {
  ctx: MonitoringContext;
  summary: ExecutionSummary;
  nodes: NodeStats[];
  performance: PerformanceStats;
  retry: RetryStats;
  runtime: RuntimeObservations;
  alerts: Alert[];
}): MonitoringRecommendation[] {
  const { ctx, summary, nodes, performance, retry, runtime, alerts } = input;
  const recommendations: MonitoringRecommendation[] = [];

  // No terminal executions ⇒ nothing observed ⇒ nothing to recommend.
  if (summary.succeeded + summary.failed === 0 && alerts.length === 0) {
    return recommendations;
  }

  /* ── credential remediation (from observed state) ──────────── */
  for (const c of ctx.credentials) {
    if (c.status === "expired" || c.status === "revoked") {
      recommendations.push({
        message: `Reconnect the ${c.integration} account.`,
        evidence: `Observed ${c.integration} connection status "${c.status}".`,
        target: c.integration,
      });
    }
  }
  if (runtime.credentialEvents.some((e) => e.level === "error" && /refresh/i.test(e.message))) {
    const ev = runtime.credentialEvents.find((e) => e.level === "error" && /refresh/i.test(e.message))!;
    recommendations.push({
      message: "Re-authorize the integration; its token refresh is failing.",
      evidence: `Observed token refresh failure: ${ev.message}`,
      target: ev.nodeId,
    });
  }

  /* ── retries (from observed retry outcomes) ────────────────── */
  const nodeRuns = ctx.nodeExecutions.length;
  const retryRate = nodeRuns > 0 ? retry.retriedRuns / nodeRuns : null;
  if (
    retryRate !== null &&
    retryRate >= THRESHOLDS.highRetryRate &&
    retry.retrySuccessRate !== null &&
    retry.retrySuccessRate >= 0.5
  ) {
    // Retries are firing AND usually rescuing the run — more attempts help.
    recommendations.push({
      message: "Increase the retry count; retries are frequently recovering these runs.",
      evidence: `${Math.round(retryRate * 100)}% of node runs retried and ${Math.round(retry.retrySuccessRate * 100)}% of retried runs eventually succeeded.`,
    });
  }
  if (retry.retrySuccessRate !== null && retry.retriedRuns > 0 && retry.retrySuccessRate < 0.2) {
    // Retrying is not helping — more attempts would just burn time.
    recommendations.push({
      message: "Retries are not recovering these failures; fix the underlying error instead of retrying.",
      evidence: `Only ${Math.round(retry.retrySuccessRate * 100)}% of ${retry.retriedRuns} retried runs succeeded.`,
    });
  }

  /* ── timeouts (from observed timeout errors) ───────────────── */
  const timeoutCount =
    runtime.timeoutEvents.length +
    ctx.nodeExecutions.filter((n) => /timeout|timed out/i.test(n.error ?? "")).length;
  if (timeoutCount > 0) {
    const slowest = nodes
      .filter((n) => n.averageRuntimeMs !== null)
      .sort((a, b) => (b.averageRuntimeMs ?? 0) - (a.averageRuntimeMs ?? 0))[0];
    recommendations.push({
      message: slowest
        ? `Increase the timeout for "${slowest.nodeId}".`
        : "Increase the workflow timeout.",
      evidence: `${timeoutCount} timeout(s) observed${slowest ? `; slowest node averages ${slowest.averageRuntimeMs}ms` : ""}.`,
      target: slowest?.nodeId,
    });
  }

  /* ── complexity (from observed runtime, not IR size alone) ─── */
  const ranNodes = nodes.filter((n) => n.runs > 0).length;
  if (
    ranNodes > THRESHOLDS.loopRunsPerExecution &&
    performance.averageRuntimeMs !== null &&
    performance.averageRuntimeMs >= THRESHOLDS.longExecutionMs
  ) {
    recommendations.push({
      message: "Split this workflow into smaller automations.",
      evidence: `${ranNodes} nodes executing with an observed average runtime of ${performance.averageRuntimeMs}ms.`,
    });
  }

  /* ── failing nodes ─────────────────────────────────────────── */
  for (const n of nodes) {
    if (n.runs > 0 && n.failures >= THRESHOLDS.repeatedFailures) {
      recommendations.push({
        message: `Investigate node "${n.nodeId}" — it is the main source of failures.`,
        evidence: `${n.failures} failures across ${n.runs} observed runs.`,
        target: n.nodeId,
      });
    }
  }

  /* ── offline ───────────────────────────────────────────────── */
  if (!ctx.active) {
    recommendations.push({
      message: "Re-activate the workflow; it is currently offline.",
      evidence: ctx.deployment
        ? `Deployment activationStatus is "${ctx.deployment.activationStatus}".`
        : "No active deployment recorded.",
    });
  }

  return recommendations;
}
