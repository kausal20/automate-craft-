/**
 * 2. Reliability Optimizer.
 *
 * Works from observed failure rates, the error distribution, and per-node
 * success rates. The reliability impact of a fix is bounded by the failures
 * actually attributable to it — never an aspirational "100% success".
 */

import {
  confidenceFromSample,
  recommendationId,
  type OptimizationRecommendation,
} from "../../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "../context";

export function optimizeReliability(ctx: OptimizationContext): OptimizationRecommendation[] {
  const m = ctx.monitoring;
  if (!m) return [];
  const confidence = confidenceFromSample(ctx.sampleSize);
  const out: OptimizationRecommendation[] = [];
  const failureRate = m.execution.failureRate;

  /* ── overall failure rate ──────────────────────────────────── */
  if (failureRate !== null && failureRate > OPT_THRESHOLDS.highFailureRate) {
    out.push({
      id: recommendationId("HIGH_FAILURE_RATE"),
      code: "HIGH_FAILURE_RATE",
      category: "reliability",
      priority: failureRate > 0.3 ? "P0" : "P1",
      severity: failureRate > 0.3 ? "critical" : "high",
      title: "Failure rate above tolerance",
      evidence: `${m.execution.failed} of ${m.execution.succeeded + m.execution.failed} terminal executions failed (${Math.round(failureRate * 100)}%).`,
      expectedBenefit: "More runs complete successfully.",
      estimatedImpact: {
        metric: "reliability",
        value: Math.round(failureRate * 100),
        unit: "percent",
        description: `Eliminating the observed failures would recover ${Math.round(failureRate * 100)}% of executions.`,
      },
      confidence,
      affectedNodes: m.nodes.filter((n) => n.failures > 0).map((n) => n.nodeId),
      difficulty: "moderate",
      risk: "low",
      reasoning: `An observed failure rate of ${Math.round(failureRate * 100)}% exceeds the ${Math.round(OPT_THRESHOLDS.highFailureRate * 100)}% tolerance.`,
    });
  }

  /* ── dominant error pattern ────────────────────────────────── */
  const dist = Object.entries(m.analytics.errorDistribution).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  if (dist.length > 0) {
    const [bucket, count] = dist[0];
    const totalErrors = dist.reduce((s, [, c]) => s + c, 0);
    // Only call it a "pattern" when one bucket actually dominates.
    if (count >= 2 && count / totalErrors >= 0.5) {
      out.push({
        id: recommendationId("REPEATED_ERROR_PATTERN", bucket),
        code: "REPEATED_ERROR_PATTERN",
        category: "reliability",
        priority: "P1",
        severity: "high",
        title: `Recurring "${bucket}" errors`,
        evidence: `"${bucket}" accounts for ${count} of ${totalErrors} observed errors (${Math.round((count / totalErrors) * 100)}%).`,
        expectedBenefit: "Fixing one root cause removes most observed failures.",
        estimatedImpact: {
          // Denominator is EXECUTIONS, not errors. "100% of errors" is not a
          // 100% reliability gain — it can only recover the runs that actually
          // failed, so the claim is scaled to the observed sample.
          metric: "reliability",
          value: ctx.sampleSize > 0 ? Math.round((count / ctx.sampleSize) * 100) : 0,
          unit: "percent",
          description: `Addressing "${bucket}" would clear ${Math.round((count / totalErrors) * 100)}% of observed errors, recovering ${
            ctx.sampleSize > 0 ? Math.round((count / ctx.sampleSize) * 100) : 0
          }% of executions.`,
        },
        confidence,
        affectedNodes: m.nodes.filter((n) => n.failures > 0).map((n) => n.nodeId),
        difficulty: "moderate",
        risk: "low",
        reasoning: `The error distribution is concentrated in "${bucket}", so it is a single root cause rather than scattered noise.`,
      });
    }
  }

  /* ── API instability ───────────────────────────────────────── */
  const apiFailures = m.failures.find((f) => f.kind === "api");
  if (apiFailures) {
    out.push({
      id: recommendationId("API_INSTABILITY"),
      code: "API_INSTABILITY",
      category: "reliability",
      priority: "P2",
      severity: "medium",
      title: "Upstream API instability observed",
      evidence: apiFailures.evidence,
      expectedBenefit: "Fewer failures caused by transient upstream errors.",
      estimatedImpact: {
        metric: "unquantified",
        value: null,
        unit: null,
        description:
          "Depends on the upstream provider's stability, which is outside this workflow's control.",
      },
      confidence,
      affectedNodes: [],
      difficulty: "easy",
      risk: "low",
      reasoning:
        "API errors were recorded at runtime; retry/backoff tuning mitigates transient upstream failures.",
    });
  }

  /* ── unreliable nodes ──────────────────────────────────────── */
  for (const n of m.nodes) {
    if (n.runs === 0 || n.successRate === null) continue;
    if (n.successRate >= OPT_THRESHOLDS.unreliableNodeRate) continue;
    out.push({
      id: recommendationId("UNRELIABLE_NODE", n.nodeId),
      code: "UNRELIABLE_NODE",
      category: "reliability",
      priority: "P1",
      severity: "high",
      title: `"${n.nodeId}" fails frequently`,
      evidence: `${n.failures} failures across ${n.runs} observed runs (${Math.round(n.successRate * 100)}% success).`,
      expectedBenefit: "Removing this node's failures lifts overall success rate.",
      estimatedImpact: {
        // Scaled to executions: a node that fails half the time but only runs
        // on a tenth of executions cannot recover half the workflow.
        metric: "reliability",
        value: ctx.sampleSize > 0 ? Math.round((n.failures / ctx.sampleSize) * 100) : 0,
        unit: "percent",
        description: `This node fails ${Math.round((1 - n.successRate) * 100)}% of the time it runs, affecting ${
          ctx.sampleSize > 0 ? Math.round((n.failures / ctx.sampleSize) * 100) : 0
        }% of executions.`,
      },
      confidence,
      affectedNodes: [n.nodeId],
      difficulty: "moderate",
      risk: "low",
      reasoning: `"${n.nodeId}" has an observed success rate of ${Math.round(n.successRate * 100)}%, below the ${Math.round(OPT_THRESHOLDS.unreliableNodeRate * 100)}% bar.`,
    });
  }

  return out;
}
