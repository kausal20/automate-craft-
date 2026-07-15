/**
 * 5. Retry Monitor — retry volume, outcome and observed reasons.
 *
 * A retry is inferred from `attempts > 1` on a node execution record — the only
 * place the runtime records it. Reasons come from the error text actually
 * attached to retried runs; nothing is invented.
 */

import type { RetryStats } from "../../models/monitoring";
import type { MonitoringContext } from "../context";

export function monitorRetries(ctx: MonitoringContext): RetryStats {
  const retried = ctx.nodeExecutions.filter((r) => r.attempts > 1);
  const totalRetries = ctx.nodeExecutions.reduce(
    (sum, r) => sum + Math.max(0, r.attempts - 1),
    0,
  );

  const retriedSucceeded = retried.filter((r) => r.status === "success").length;
  const retriedFailed = retried.filter((r) => r.status === "error").length;
  const terminal = retriedSucceeded + retriedFailed;

  const reasons: Record<string, number> = {};
  for (const r of retried) {
    const reason = normalizeReason(r.error);
    reasons[reason] = (reasons[reason] ?? 0) + 1;
  }

  return {
    totalRetries,
    retriedRuns: retried.length,
    retrySuccessRate: terminal > 0 ? retriedSucceeded / terminal : null,
    retryFailureRate: terminal > 0 ? retriedFailed / terminal : null,
    reasons,
  };
}

/**
 * Collapse an error message to a stable bucket so tallies are meaningful.
 * Unknown text is bucketed verbatim (truncated) rather than guessed at.
 */
export function normalizeReason(error: string | undefined): string {
  if (!error) return "unspecified";
  const n = error.toLowerCase();
  if (/timeout|timed out|etimedout/.test(n)) return "timeout";
  if (/econnrefused|enotfound|network|fetch failed/.test(n)) return "network";
  if (/rate.?limit|429|too many requests/.test(n)) return "rate_limit";
  if (/unauthor|401|invalid_auth|token/.test(n)) return "auth";
  if (/forbidden|403|permission|scope/.test(n)) return "permission";
  if (/5\d\d|server error|internal error/.test(n)) return "server_error";
  return error.slice(0, 60);
}
