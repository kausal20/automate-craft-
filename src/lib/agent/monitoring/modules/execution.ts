/**
 * 1. Execution Monitor — aggregate the observed runs.
 *
 * Pure tally of ExecutionRecords. Rates are null (not 0) when there is nothing
 * terminal to divide by: "no data" and "0%" are different facts.
 */

import type { ExecutionSummary } from "../../models/monitoring";
import type { MonitoringContext } from "../context";

export function monitorExecutions(ctx: MonitoringContext): ExecutionSummary {
  const runs = ctx.executions;

  const succeeded = runs.filter((r) => r.status === "success").length;
  const failed = runs.filter((r) => r.status === "error").length;
  const running = runs.filter((r) => r.status === "running").length;
  const cancelled = runs.filter((r) => r.status === "cancelled").length;
  const terminal = succeeded + failed;

  const byTrigger: Record<string, number> = {};
  for (const r of runs) {
    byTrigger[r.trigger] = (byTrigger[r.trigger] ?? 0) + 1;
  }

  const starts = runs.map((r) => r.startedAt);

  return {
    total: runs.length,
    succeeded,
    failed,
    running,
    cancelled,
    successRate: terminal > 0 ? succeeded / terminal : null,
    failureRate: terminal > 0 ? failed / terminal : null,
    firstExecutionAt: starts.length > 0 ? Math.min(...starts) : null,
    lastExecutionAt: starts.length > 0 ? Math.max(...starts) : null,
    byTrigger,
  };
}
