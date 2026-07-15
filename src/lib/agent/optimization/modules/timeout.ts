/**
 * 4. Timeout Optimizer.
 *
 * Recommends timeout changes ONLY from observed runtime behaviour:
 *   - timeouts actually occurred            → raise the node's timeout
 *   - configured timeout ≫ observed p95     → it is over-provisioned
 *   - workflow budget < observed total      → raise the workflow timeout
 *
 * A configured timeout with no observed pressure is left alone.
 */

import {
  confidenceFromSample,
  recommendationId,
  type OptimizationRecommendation,
} from "../../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "../context";

export function optimizeTimeouts(ctx: OptimizationContext): OptimizationRecommendation[] {
  const m = ctx.monitoring;
  if (!m) return [];
  const confidence = confidenceFromSample(ctx.sampleSize);
  const out: OptimizationRecommendation[] = [];

  const timeoutPattern = m.failures.find((f) => f.kind === "timeout");

  /* ── timeouts observed → raise the slowest node's timeout ──── */
  if (timeoutPattern && timeoutPattern.count >= OPT_THRESHOLDS.timeoutEvidence) {
    const slowest = [...m.nodes]
      .filter((n) => n.averageRuntimeMs !== null)
      .sort((a, b) => (b.averageRuntimeMs ?? 0) - (a.averageRuntimeMs ?? 0))[0];
    const irNode = slowest
      ? ctx.ir?.graph.nodes.find((n) => n.id === slowest.nodeId)
      : undefined;
    const configured = irNode?.timeoutPolicy.timeoutMs ?? null;

    out.push({
      id: recommendationId("INCREASE_NODE_TIMEOUT", slowest?.nodeId),
      code: "INCREASE_NODE_TIMEOUT",
      category: "timeout",
      priority: "P1",
      severity: "high",
      title: slowest
        ? `Increase the timeout for "${slowest.nodeId}"`
        : "Increase the node timeout",
      evidence: `${timeoutPattern.count} timeout(s) observed${slowest?.averageRuntimeMs != null ? `; slowest node averages ${slowest.averageRuntimeMs}ms` : ""}${configured !== null ? ` against a configured ${configured}ms` : ""}.`,
      expectedBenefit: "Slow-but-valid runs complete instead of being cut off.",
      estimatedImpact: {
        metric: "reliability",
        value: null,
        unit: null,
        description:
          "Recovers the runs currently lost to timeouts; the exact share depends on upstream latency.",
      },
      confidence,
      affectedNodes: slowest ? [slowest.nodeId] : [],
      difficulty: "trivial",
      risk: "low",
      reasoning:
        "Timeouts were recorded at runtime, so the configured budget is cutting off work that would otherwise finish.",
    });
  }

  /* ── over-provisioned node timeouts ────────────────────────── */
  // Only when we have an observed p95 to compare against.
  if (m.performance.p95RuntimeMs !== null && ctx.ir) {
    for (const irNode of ctx.ir.graph.nodes) {
      if (irNode.type !== "action") continue;
      const observed = m.nodes.find((n) => n.nodeId === irNode.id);
      if (!observed || observed.runs === 0 || observed.averageRuntimeMs === null) continue;
      // Never suggest tightening a timeout on a node that has timed out.
      if (timeoutPattern) continue;

      const configured = irNode.timeoutPolicy.timeoutMs;
      if (configured >= observed.averageRuntimeMs * OPT_THRESHOLDS.timeoutOverProvisionMultiple) {
        out.push({
          id: recommendationId("DECREASE_NODE_TIMEOUT", irNode.id),
          code: "DECREASE_NODE_TIMEOUT",
          category: "timeout",
          priority: "P3",
          severity: "low",
          title: `"${irNode.id}" timeout is far above observed runtime`,
          evidence: `Configured ${configured}ms vs an observed ${observed.averageRuntimeMs}ms average over ${observed.runs} runs.`,
          expectedBenefit: "A stuck node fails fast instead of holding the run open.",
          estimatedImpact: {
            metric: "unquantified",
            value: null,
            unit: null,
            description: "Only affects the stuck-run case; no change in the normal path.",
          },
          confidence,
          affectedNodes: [irNode.id],
          difficulty: "trivial",
          // Tightening a timeout can cut off legitimate slow runs.
          risk: "medium",
          reasoning: `The configured timeout is ${Math.round(configured / observed.averageRuntimeMs)}× the observed average, so a hung call would wait far longer than necessary. Leave headroom for legitimate outliers.`,
        });
      }
    }
  }

  /* ── workflow budget below observed reality ────────────────── */
  if (m.performance.p95RuntimeMs !== null && ctx.ir) {
    const budget = ctx.ir.graph.nodes.reduce((s, n) => s + n.timeoutPolicy.timeoutMs, 0);
    if (budget > 0 && m.performance.p95RuntimeMs > budget) {
      out.push({
        id: recommendationId("INCREASE_WORKFLOW_TIMEOUT"),
        code: "INCREASE_WORKFLOW_TIMEOUT",
        category: "timeout",
        priority: "P1",
        severity: "high",
        title: "Workflow timeout budget is below observed p95",
        evidence: `Observed p95 runtime is ${m.performance.p95RuntimeMs}ms against a ${budget}ms configured budget.`,
        expectedBenefit: "Slow runs finish rather than being cut off at the workflow level.",
        estimatedImpact: {
          metric: "runtime",
          value: m.performance.p95RuntimeMs - budget,
          unit: "ms",
          description: `The budget is ${m.performance.p95RuntimeMs - budget}ms short of the observed p95.`,
        },
        confidence,
        affectedNodes: [],
        difficulty: "trivial",
        risk: "low",
        reasoning:
          "One in twenty runs already exceeds the configured budget, so the workflow-level timeout will cut them off.",
      });
    }
  }

  return out;
}
