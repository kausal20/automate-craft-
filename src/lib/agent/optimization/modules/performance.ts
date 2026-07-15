/**
 * 1. Performance Optimizer.
 *
 * Every recommendation is derived from measured runtimes in the monitoring
 * report. Where an impact can be computed from real numbers it is; where it
 * cannot, it is reported as unquantified rather than invented.
 */

import {
  confidenceFromSample,
  recommendationId,
  type OptimizationRecommendation,
} from "../../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "../context";

export function optimizePerformance(ctx: OptimizationContext): OptimizationRecommendation[] {
  const m = ctx.monitoring;
  if (!m) return [];
  const perf = m.performance;
  const confidence = confidenceFromSample(ctx.sampleSize);
  const out: OptimizationRecommendation[] = [];

  /* ── bottleneck node ───────────────────────────────────────── */
  // Only meaningful when we know BOTH the node's average and the workflow's.
  if (perf.averageRuntimeMs !== null && perf.slowestNodeId) {
    const slowest = m.nodes.find((n) => n.nodeId === perf.slowestNodeId);
    if (slowest?.averageRuntimeMs != null && perf.averageRuntimeMs > 0) {
      const share = slowest.averageRuntimeMs / perf.averageRuntimeMs;
      if (share >= OPT_THRESHOLDS.bottleneckShare) {
        out.push({
          id: recommendationId("SLOW_NODE_BOTTLENECK", slowest.nodeId),
          code: "SLOW_NODE_BOTTLENECK",
          category: "performance",
          priority: share >= 0.7 ? "P1" : "P2",
          severity: share >= 0.7 ? "high" : "medium",
          title: `"${slowest.nodeId}" dominates workflow runtime`,
          evidence: `Node averages ${slowest.averageRuntimeMs}ms of the workflow's ${perf.averageRuntimeMs}ms average (${Math.round(share * 100)}%) across ${slowest.runs} observed runs.`,
          expectedBenefit: "Reducing this node's latency shortens most executions.",
          estimatedImpact: {
            metric: "runtime",
            // Upper bound on what optimising this node could save.
            value: slowest.averageRuntimeMs,
            unit: "ms",
            description: `Up to ${slowest.averageRuntimeMs}ms per execution — this node's full observed average.`,
          },
          confidence,
          affectedNodes: [slowest.nodeId],
          difficulty: "moderate",
          risk: "low",
          reasoning: `"${slowest.nodeId}" is the slowest observed node and accounts for ${Math.round(share * 100)}% of average runtime, so it is where latency work pays off most.`,
        });
      }
    }
  }

  /* ── p95 tail latency ──────────────────────────────────────── */
  // Two conditions: the tail must be slow in absolute terms AND actually be a
  // tail. When p95 tracks the median the runs are uniformly slow, which is a
  // different finding with a different fix.
  const tail =
    perf.p95RuntimeMs !== null && perf.medianRuntimeMs !== null && perf.medianRuntimeMs > 0
      ? perf.p95RuntimeMs / perf.medianRuntimeMs
      : null;
  const tailIsReal = tail === null || tail >= OPT_THRESHOLDS.tailRatio;
  if (perf.p95RuntimeMs !== null && perf.p95RuntimeMs >= OPT_THRESHOLDS.highP95Ms && tailIsReal) {
    out.push({
      id: recommendationId("HIGH_P95_LATENCY"),
      code: "HIGH_P95_LATENCY",
      category: "performance",
      priority: "P2",
      severity: "medium",
      title: "Slow tail latency",
      evidence: `p95 is ${perf.p95RuntimeMs}ms${tail !== null ? ` — ${tail.toFixed(1)}× the ${perf.medianRuntimeMs}ms median` : ""}, over ${ctx.sampleSize} executions.`,
      expectedBenefit: "Fewer slow outlier runs and less timeout risk.",
      estimatedImpact:
        perf.medianRuntimeMs !== null
          ? {
              metric: "runtime",
              value: perf.p95RuntimeMs - perf.medianRuntimeMs,
              unit: "ms",
              description: `Closing the p95→median gap would save ~${perf.p95RuntimeMs - perf.medianRuntimeMs}ms on slow runs.`,
            }
          : {
              metric: "runtime",
              value: null,
              unit: null,
              description: "No median observed, so the tail gap cannot be quantified.",
            },
      confidence,
      affectedNodes: perf.slowestNodeId ? [perf.slowestNodeId] : [],
      difficulty: "moderate",
      risk: "low",
      reasoning: `A p95 of ${perf.p95RuntimeMs}ms exceeds the ${OPT_THRESHOLDS.highP95Ms}ms guidance, meaning a meaningful slice of runs is slow even if the median looks fine.`,
    });
  }

  /* ── long-running workflow ─────────────────────────────────── */
  if (perf.averageRuntimeMs !== null && perf.averageRuntimeMs >= OPT_THRESHOLDS.longRuntimeMs) {
    out.push({
      id: recommendationId("LONG_RUNNING_WORKFLOW"),
      code: "LONG_RUNNING_WORKFLOW",
      category: "performance",
      priority: "P2",
      severity: "medium",
      title: "Workflow runs long on average",
      evidence: `Average runtime is ${perf.averageRuntimeMs}ms across ${ctx.sampleSize} executions.`,
      expectedBenefit: "Faster end-to-end automation and lower timeout exposure.",
      estimatedImpact: {
        metric: "unquantified",
        value: null,
        unit: null,
        description:
          "Total saving depends on which nodes are optimised; per-node data is reported separately.",
      },
      confidence,
      affectedNodes: [],
      difficulty: "moderate",
      risk: "low",
      reasoning: `Observed average of ${perf.averageRuntimeMs}ms exceeds the ${OPT_THRESHOLDS.longRuntimeMs}ms guidance for a responsive automation.`,
    });
  }

  return out;
}
