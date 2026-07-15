/**
 * 10. Analytics Engine — roll observations into workflow statistics.
 *
 * Pure aggregation over what the other monitors already observed. Adds only the
 * error distribution, which is computed from real error text (bucketed by the
 * retry monitor's normalizer so tallies stay meaningful).
 */

import type {
  Analytics,
  ExecutionSummary,
  NodeStats,
  PerformanceStats,
  RetryStats,
} from "../../models/monitoring";
import type { MonitoringContext } from "../context";
import { normalizeReason } from "./retry";

export function buildAnalytics(input: {
  ctx: MonitoringContext;
  summary: ExecutionSummary;
  nodes: NodeStats[];
  performance: PerformanceStats;
  retry: RetryStats;
}): Analytics {
  const { ctx, summary, nodes, performance, retry } = input;

  /* ── error distribution ────────────────────────────────────── */
  const errorDistribution: Record<string, number> = {};
  for (const e of ctx.executions) {
    if (e.status !== "error") continue;
    const bucket = normalizeReason(e.error);
    errorDistribution[bucket] = (errorDistribution[bucket] ?? 0) + 1;
  }
  for (const n of ctx.nodeExecutions) {
    if (n.status !== "error") continue;
    const bucket = normalizeReason(n.error);
    errorDistribution[bucket] = (errorDistribution[bucket] ?? 0) + 1;
  }

  return {
    executionCount: summary.total,
    successRate: summary.successRate,
    failureRate: summary.failureRate,
    averageRuntimeMs: performance.averageRuntimeMs,
    errorDistribution,
    retry,
    nodes,
    performance,
  };
}
