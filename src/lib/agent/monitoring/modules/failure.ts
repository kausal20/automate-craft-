/**
 * 6. Failure Monitor — detect failure PATTERNS in observed history.
 *
 * Every pattern carries the evidence that produced it. Thresholds live in
 * context.ts so detection is fixed and reproducible.
 */

import type { FailurePattern } from "../../models/monitoring";
import { THRESHOLDS, type MonitoringContext } from "../context";
import type { RuntimeObservations } from "./runtime";

export function monitorFailures(
  ctx: MonitoringContext,
  runtime: RuntimeObservations,
): FailurePattern[] {
  const patterns: FailurePattern[] = [];

  /* ── repeated failures ─────────────────────────────────────── */
  const failed = ctx.executions.filter((e) => e.status === "error");
  if (failed.length >= THRESHOLDS.repeatedFailures) {
    patterns.push({
      kind: "repeated",
      count: failed.length,
      evidence: `${failed.length} failed executions observed in the window.`,
    });
  }

  /* ── timeouts ──────────────────────────────────────────────── */
  const timeouts =
    runtime.timeoutEvents.length +
    ctx.nodeExecutions.filter((n) => /timeout|timed out/i.test(n.error ?? "")).length;
  if (timeouts > 0) {
    patterns.push({
      kind: "timeout",
      count: timeouts,
      evidence: `${timeouts} timeout(s) recorded in runtime events / node errors.`,
    });
  }

  /* ── api failures ──────────────────────────────────────────── */
  if (runtime.apiEvents.length > 0) {
    patterns.push({
      kind: "api",
      count: runtime.apiEvents.length,
      evidence: `${runtime.apiEvents.length} API/network error event(s) recorded.`,
    });
  }

  /* ── credential failures ───────────────────────────────────── */
  const credentialErrors = runtime.credentialEvents.filter((e) => e.level === "error");
  if (credentialErrors.length > 0) {
    patterns.push({
      kind: "credential",
      count: credentialErrors.length,
      evidence: `${credentialErrors.length} credential/auth error event(s): ${credentialErrors[0].message}`,
    });
  }

  /* ── webhook failures ──────────────────────────────────────── */
  const webhookErrors = runtime.errors.filter((e) => /webhook/i.test(`${e.kind} ${e.message}`));
  if (webhookErrors.length > 0) {
    patterns.push({
      kind: "webhook",
      count: webhookErrors.length,
      evidence: `${webhookErrors.length} webhook error event(s): ${webhookErrors[0].message}`,
    });
  }

  /* ── retry storms (per node) ───────────────────────────────── */
  const retriesByNode = new Map<string, number>();
  for (const n of ctx.nodeExecutions) {
    const extra = Math.max(0, n.attempts - 1);
    if (extra > 0) retriesByNode.set(n.nodeId, (retriesByNode.get(n.nodeId) ?? 0) + extra);
  }
  for (const [nodeId, count] of [...retriesByNode].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (count >= THRESHOLDS.retryStorm) {
      patterns.push({
        kind: "retry_storm",
        count,
        target: nodeId,
        evidence: `Node "${nodeId}" retried ${count} times (threshold ${THRESHOLDS.retryStorm}).`,
      });
    }
  }

  /* ── execution loops ───────────────────────────────────────── */
  // The same node running many times inside ONE execution indicates a loop.
  const perExecution = new Map<string, Map<string, number>>();
  for (const n of ctx.nodeExecutions) {
    if (!perExecution.has(n.executionId)) perExecution.set(n.executionId, new Map());
    const byNode = perExecution.get(n.executionId)!;
    byNode.set(n.nodeId, (byNode.get(n.nodeId) ?? 0) + 1);
  }
  for (const [executionId, byNode] of [...perExecution].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (const [nodeId, runs] of [...byNode].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (runs >= THRESHOLDS.loopRunsPerExecution) {
        patterns.push({
          kind: "loop",
          count: runs,
          target: nodeId,
          evidence: `Node "${nodeId}" ran ${runs} times within execution ${executionId}.`,
        });
      }
    }
  }

  return patterns;
}

/** Longest run of consecutive failures, most recent history first. */
export function consecutiveFailures(ctx: MonitoringContext): number {
  const ordered = [...ctx.executions]
    .filter((e) => e.status === "success" || e.status === "error")
    .sort((a, b) => b.startedAt - a.startedAt);
  let streak = 0;
  for (const e of ordered) {
    if (e.status !== "error") break;
    streak += 1;
  }
  return streak;
}
