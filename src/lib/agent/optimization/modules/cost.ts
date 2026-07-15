/**
 * 8. Cost Optimizer.
 *
 * Cost is expressed in units we can actually observe — executions, retries and
 * API calls — never in currency, which we have no basis to compute. Suggesting
 * a "cheaper alternative" without pricing data would be speculation.
 */

import {
  confidenceFromSample,
  recommendationId,
  type OptimizationRecommendation,
} from "../../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "../context";

export function optimizeCost(ctx: OptimizationContext): OptimizationRecommendation[] {
  const m = ctx.monitoring;
  if (!m) return [];
  const confidence = confidenceFromSample(ctx.sampleSize);
  const out: OptimizationRecommendation[] = [];

  /* ── high-frequency execution ──────────────────────────────── */
  // Throughput is a RATE, and a rate derived from a short window is an
  // extrapolation — 5 runs in 5 minutes reads as 60/hour without ever having
  // observed an hour. Require the raw run count to clear the bar too, so the
  // claim rests on runs we actually saw.
  const throughput = m.performance.throughputPerHour;
  if (
    throughput !== null &&
    throughput >= OPT_THRESHOLDS.highFrequencyPerHour &&
    m.execution.total >= OPT_THRESHOLDS.highFrequencyPerHour
  ) {
    out.push({
      id: recommendationId("HIGH_FREQUENCY_EXECUTION"),
      code: "HIGH_FREQUENCY_EXECUTION",
      category: "cost",
      priority: "P2",
      severity: "medium",
      title: "High execution frequency",
      evidence: `Observed throughput is ${throughput} executions/hour across ${m.execution.total} runs.`,
      expectedBenefit: "Batching or filtering reduces total API calls and quota use.",
      estimatedImpact: {
        metric: "cost",
        value: Math.round(throughput),
        unit: "executions",
        description: `${Math.round(throughput)} executions/hour, each making the workflow's API calls.`,
      },
      confidence,
      affectedNodes: [],
      difficulty: "moderate",
      // Batching/filtering changes when work happens — a business decision.
      risk: "medium",
      reasoning: `Throughput exceeds ${OPT_THRESHOLDS.highFrequencyPerHour}/hour. Whether these runs can be batched or filtered is a business-logic question, so this is raised for review.`,
    });
  }

  /* ── retry waste ───────────────────────────────────────────── */
  const retry = m.analytics.retry;
  if (retry.totalRetries > 0 && retry.retrySuccessRate !== null && retry.retrySuccessRate < OPT_THRESHOLDS.retryEffective) {
    const wasted = Math.round(retry.totalRetries * (1 - retry.retrySuccessRate));
    out.push({
      id: recommendationId("RETRY_WASTE"),
      code: "RETRY_WASTE",
      category: "cost",
      priority: "P2",
      severity: "medium",
      title: "Retries are consuming calls without recovering runs",
      evidence: `${retry.totalRetries} retries with only a ${Math.round(retry.retrySuccessRate * 100)}% recovery rate — roughly ${wasted} wasted attempt(s).`,
      expectedBenefit: "Fewer wasted API calls against quota and rate limits.",
      estimatedImpact: {
        metric: "cost",
        value: wasted,
        unit: "executions",
        description: `~${wasted} retry attempts produced no recovery.`,
      },
      confidence,
      affectedNodes: m.nodes.filter((n) => n.retries > 0).map((n) => n.nodeId),
      difficulty: "easy",
      risk: "medium",
      reasoning:
        "Each retry is a real API call. With recovery below the effective threshold, most of those calls buy nothing — fix the cause before trimming attempts.",
    });
  }

  /* ── expensive API usage ───────────────────────────────────── */
  // "Expensive" = a node that both runs on every execution AND is slow enough
  // to dominate. Both facts are observed.
  if (m.performance.averageRuntimeMs !== null && m.execution.total > 0) {
    for (const n of m.nodes) {
      if (n.runs === 0 || n.averageRuntimeMs === null) continue;
      const runsEveryExecution = n.runs >= m.execution.total;
      const dominates =
        m.performance.averageRuntimeMs > 0 &&
        n.averageRuntimeMs / m.performance.averageRuntimeMs >= OPT_THRESHOLDS.bottleneckShare;
      if (!runsEveryExecution || !dominates) continue;

      out.push({
        id: recommendationId("EXPENSIVE_API_USAGE", n.nodeId),
        code: "EXPENSIVE_API_USAGE",
        category: "cost",
        priority: "P3",
        severity: "low",
        title: `"${n.nodeId}" is called on every execution and is slow`,
        evidence: `${n.runs} calls across ${m.execution.total} executions, averaging ${n.averageRuntimeMs}ms (${Math.round((n.averageRuntimeMs / m.performance.averageRuntimeMs) * 100)}% of workflow runtime).`,
        expectedBenefit: "Caching or conditional execution avoids unnecessary calls.",
        estimatedImpact: {
          metric: "cost",
          value: n.runs,
          unit: "executions",
          description: `${n.runs} observed calls to this integration.`,
        },
        confidence,
        affectedNodes: [n.nodeId],
        difficulty: "hard",
        // Skipping a call conditionally changes behaviour.
        risk: "high",
        reasoning: `This node runs on every execution and dominates runtime. Whether any call can be cached or skipped depends on business rules, so this is informational only.`,
      });
    }
  }

  return out;
}
