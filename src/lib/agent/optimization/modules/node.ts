/**
 * 6. Node Optimizer — per-node configuration and ordering.
 *
 * Compares each node's CONFIGURED policy (from the IR) against its OBSERVED
 * behaviour (from monitoring). A mismatch between the two is the only thing
 * that produces a recommendation here.
 */

import {
  confidenceFromSample,
  recommendationId,
  type OptimizationRecommendation,
} from "../../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "../context";

export function optimizeNodes(ctx: OptimizationContext): OptimizationRecommendation[] {
  const m = ctx.monitoring;
  if (!m || !ctx.ir) return [];
  const confidence = confidenceFromSample(ctx.sampleSize);
  const out: OptimizationRecommendation[] = [];

  for (const irNode of ctx.ir.graph.nodes) {
    if (irNode.type !== "action") continue;
    const observed = m.nodes.find((n) => n.nodeId === irNode.id);
    if (!observed || observed.runs === 0) continue;

    /* ── config: node fails + retries yet has no retry policy ── */
    if (
      observed.failures > 0 &&
      observed.retries === 0 &&
      irNode.errorPolicy !== "retry" &&
      observed.successRate !== null &&
      observed.successRate < 1
    ) {
      out.push({
        id: recommendationId("NODE_CONFIG_IMPROVEMENT", irNode.id),
        code: "NODE_CONFIG_IMPROVEMENT",
        category: "node",
        priority: "P2",
        severity: "medium",
        title: `Enable retries on "${irNode.id}"`,
        evidence: `${observed.failures} failure(s) across ${observed.runs} runs with errorPolicy "${irNode.errorPolicy}" and no retries attempted.`,
        expectedBenefit: "Transient failures on this node recover automatically.",
        estimatedImpact: {
          metric: "reliability",
          value: Math.round((1 - observed.successRate) * 100),
          unit: "percent",
          description: `Up to ${Math.round((1 - observed.successRate) * 100)}% of this node's runs currently fail; retries would recover the transient share.`,
        },
        confidence,
        affectedNodes: [irNode.id],
        difficulty: "trivial",
        // A "continue" node that starts retrying changes timing, not outcome.
        risk: "low",
        reasoning: `"${irNode.id}" is failing but is not configured to retry, so every transient error becomes a hard failure. Only the transient portion is recoverable — a persistent fault still needs a fix.`,
      });
    }

    /* ── config: node continues on error despite being critical ── */
    if (irNode.errorPolicy === "continue" && observed.failures > 0 && irNode.integration) {
      const isWrite = /create|update|append|save|write|charge|capture/.test(irNode.operation);
      if (isWrite) {
        out.push({
          id: recommendationId("NODE_CONFIG_IMPROVEMENT", `${irNode.id}_onerror`),
          code: "NODE_CONFIG_IMPROVEMENT",
          category: "node",
          priority: "P1",
          severity: "high",
          title: `"${irNode.id}" silently continues after failing`,
          evidence: `${observed.failures} failure(s) observed on a write operation ("${irNode.operation}") configured with errorPolicy "continue".`,
          expectedBenefit: "Data-losing failures surface instead of passing silently.",
          estimatedImpact: {
            metric: "unquantified",
            value: null,
            unit: null,
            description:
              "Prevents silent data loss; no runtime figure applies to correctness.",
          },
          confidence,
          affectedNodes: [irNode.id],
          difficulty: "trivial",
          risk: "low",
          reasoning: `A write step that continues on error means the run reports success while the write did not happen. This node has actually failed ${observed.failures} time(s), so the risk is real rather than theoretical.`,
        });
      }
    }

    /* ── ordering: an expensive node runs before a failing one ── */
    // If a cheap node fails often and runs AFTER an expensive one, the
    // expensive work is wasted whenever the cheap node fails.
    if (
      observed.successRate !== null &&
      observed.successRate < OPT_THRESHOLDS.unreliableNodeRate
    ) {
      const earlier = ctx.ir.graph.nodes.filter(
        (n) => n.type === "action" && n.executionOrder < irNode.executionOrder,
      );
      const earlierCost = earlier
        .map((n) => m.nodes.find((x) => x.nodeId === n.id)?.averageRuntimeMs ?? 0)
        .reduce((a, b) => a + b, 0);
      const ownCost = observed.averageRuntimeMs ?? 0;

      if (earlier.length > 0 && earlierCost > ownCost * 2 && ownCost > 0) {
        out.push({
          id: recommendationId("NODE_ORDERING_IMPROVEMENT", irNode.id),
          code: "NODE_ORDERING_IMPROVEMENT",
          category: "node",
          priority: "P3",
          severity: "low",
          title: `Consider validating "${irNode.id}" earlier`,
          evidence: `"${irNode.id}" fails ${Math.round((1 - observed.successRate) * 100)}% of runs but executes after ~${Math.round(earlierCost)}ms of upstream work (it costs ${Math.round(ownCost)}ms itself).`,
          expectedBenefit: "Failing runs abort before the expensive work is done.",
          estimatedImpact: {
            metric: "runtime",
            value: Math.round(earlierCost * (1 - observed.successRate)),
            unit: "ms",
            description: `~${Math.round(earlierCost * (1 - observed.successRate))}ms of upstream work is currently wasted per execution on average, from this node's failure rate.`,
          },
          confidence,
          affectedNodes: [irNode.id, ...earlier.map((n) => n.id)],
          difficulty: "hard",
          // Reordering can change semantics — flag only.
          risk: "high",
          reasoning: `Work costing ~${Math.round(earlierCost)}ms happens before a node that fails ${Math.round((1 - observed.successRate) * 100)}% of the time. Reordering is only valid if the data dependencies allow it — this is a review flag, not an instruction.`,
        });
      }
    }
  }

  return out;
}
