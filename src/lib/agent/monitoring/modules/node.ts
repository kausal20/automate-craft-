/**
 * 3. Node Monitor — per-node observed statistics.
 *
 * Only nodes that actually ran appear. A node in the IR with zero recorded
 * runs is reported with runs=0 and null rates rather than being silently
 * dropped — "never ran" is itself an observation.
 */

import type { NodeStats } from "../../models/monitoring";
import type { MonitoringContext } from "../context";

export function monitorNodes(ctx: MonitoringContext): NodeStats[] {
  // Seed from the IR so never-run nodes are visible, then fold in observations.
  const ids = new Set<string>();
  for (const n of ctx.ir?.graph.nodes ?? []) {
    if (n.type === "action") ids.add(n.id);
  }
  for (const r of ctx.nodeExecutions) ids.add(r.nodeId);

  const stats: NodeStats[] = [];
  for (const nodeId of [...ids].sort()) {
    const records = ctx.nodeExecutions.filter((r) => r.nodeId === nodeId);
    const runs = records.length;
    const failures = records.filter((r) => r.status === "error").length;
    const successes = records.filter((r) => r.status === "success").length;
    // attempts beyond the first are retries
    const retries = records.reduce((sum, r) => sum + Math.max(0, r.attempts - 1), 0);

    const timed = records.filter(
      (r): r is typeof r & { finishedAt: number } => r.finishedAt !== null,
    );
    const durations = timed.map((r) => r.finishedAt - r.startedAt);

    const lastTimed = [...timed].sort((a, b) => b.startedAt - a.startedAt)[0];
    const lastFailure = [...records]
      .filter((r) => r.status === "error")
      .sort((a, b) => b.startedAt - a.startedAt)[0];

    stats.push({
      nodeId,
      runs,
      failures,
      retries,
      averageRuntimeMs:
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
      lastRuntimeMs: lastTimed ? lastTimed.finishedAt - lastTimed.startedAt : null,
      lastFailureAt: lastFailure ? lastFailure.startedAt : null,
      // Rate over runs that reached a terminal state.
      successRate: runs > 0 ? successes / runs : null,
    });
  }

  return stats;
}
