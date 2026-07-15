/**
 * 8. Performance Monitor — latency distribution + throughput from real runs.
 *
 * Percentiles use the nearest-rank method on completed executions. Every value
 * is null when there is not enough observed data to compute it honestly.
 */

import type { NodeStats, PerformanceStats } from "../../models/monitoring";
import type { MonitoringContext } from "../context";

/** Nearest-rank percentile. `sorted` must be ascending and non-empty. */
export function percentile(sorted: number[], p: number): number {
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index];
}

export function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export function monitorPerformance(
  ctx: MonitoringContext,
  nodes: NodeStats[],
): PerformanceStats {
  const completed = ctx.executions.filter(
    (e): e is typeof e & { finishedAt: number } => e.finishedAt !== null,
  );
  const durations = completed.map((e) => e.finishedAt - e.startedAt).sort((a, b) => a - b);

  // Slowest / fastest by observed average — nodes that never completed a timed
  // run are not candidates (no evidence).
  const timedNodes = nodes.filter(
    (n): n is NodeStats & { averageRuntimeMs: number } => n.averageRuntimeMs !== null,
  );
  const bySpeed = [...timedNodes].sort(
    (a, b) => a.averageRuntimeMs - b.averageRuntimeMs || a.nodeId.localeCompare(b.nodeId),
  );

  /* ── throughput ────────────────────────────────────────────── */
  // Needs ≥2 runs to have a window at all.
  let throughputPerHour: number | null = null;
  if (completed.length >= 2) {
    const starts = ctx.executions.map((e) => e.startedAt);
    const windowMs = Math.max(...starts) - Math.min(...starts);
    throughputPerHour =
      windowMs > 0
        ? Math.round((ctx.executions.length / (windowMs / 3_600_000)) * 100) / 100
        : null;
  }

  return {
    averageRuntimeMs:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
    medianRuntimeMs: durations.length > 0 ? median(durations) : null,
    p95RuntimeMs: durations.length > 0 ? percentile(durations, 95) : null,
    p99RuntimeMs: durations.length > 0 ? percentile(durations, 99) : null,
    slowestNodeId: bySpeed.length > 0 ? bySpeed[bySpeed.length - 1].nodeId : null,
    fastestNodeId: bySpeed.length > 0 ? bySpeed[0].nodeId : null,
    throughputPerHour,
  };
}
