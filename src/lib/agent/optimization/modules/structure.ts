/**
 * 5. Workflow Structure Optimizer.
 *
 * Structural observations only — NEVER a change that would alter business
 * logic. Every suggestion here is either a no-op for behaviour (removing a node
 * that never runs) or an explicit "review this" flag for a human. Anything that
 * could change what the workflow *does* is surfaced as information, not as an
 * instruction, and carries its real risk level.
 */

import {
  confidenceFromSample,
  recommendationId,
  type OptimizationRecommendation,
} from "../../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "../context";

export function optimizeStructure(ctx: OptimizationContext): OptimizationRecommendation[] {
  const m = ctx.monitoring;
  if (!m || !ctx.ir) return [];
  const confidence = confidenceFromSample(ctx.sampleSize);
  const out: OptimizationRecommendation[] = [];

  /* ── nodes that never ran ──────────────────────────────────── */
  // Two conditions, both required. The workflow must HAVE executed, otherwise
  // "never ran" just means "never tried". And node-level telemetry must
  // actually be arriving — proven by at least one node reporting runs. With no
  // per-node records at all, every node looks unused, but that is a gap in
  // observation, not evidence of a dead node.
  const nodeTelemetryPresent = m.nodes.some((n) => n.runs > 0);
  if (m.execution.total > 0 && nodeTelemetryPresent) {
    for (const n of m.nodes) {
      if (n.runs > 0) continue;
      out.push({
        id: recommendationId("UNUSED_NODE", n.nodeId),
        code: "UNUSED_NODE",
        category: "structure",
        priority: "P3",
        severity: "low",
        title: `"${n.nodeId}" never executed`,
        evidence: `Zero runs recorded across ${m.execution.total} observed executions.`,
        expectedBenefit: "A simpler workflow with less to maintain and validate.",
        estimatedImpact: {
          metric: "unquantified",
          value: null,
          unit: null,
          description: "No runtime saving — the node never ran. The gain is simplicity.",
        },
        confidence,
        affectedNodes: [n.nodeId],
        difficulty: "easy",
        // It may be a branch that simply has not been exercised yet.
        risk: "medium",
        reasoning: `"${n.nodeId}" recorded no executions in the observed window. Confirm it is genuinely dead rather than a path that has not been triggered yet before removing it.`,
      });
    }
  }

  /* ── duplicate work ────────────────────────────────────────── */
  // The Validator already flags identical actions; here we report it as an
  // efficiency finding when it was actually executed.
  const dupIssue = ctx.validation?.issues.find((i) => i.code === "DUPLICATE_ACTION");
  if (dupIssue) {
    out.push({
      id: recommendationId("DUPLICATE_WORK", dupIssue.affectedNode),
      code: "DUPLICATE_WORK",
      category: "structure",
      priority: "P2",
      severity: "medium",
      title: "Duplicate action detected",
      evidence: dupIssue.message,
      expectedBenefit: "Removes redundant external calls each execution.",
      estimatedImpact: {
        metric: "unquantified",
        value: null,
        unit: null,
        description: "Saving equals the duplicated node's runtime, once confirmed redundant.",
      },
      confidence,
      affectedNodes: dupIssue.affectedNode ? [dupIssue.affectedNode] : [],
      difficulty: "easy",
      risk: "medium",
      reasoning:
        "Two steps perform the same action with the same parameters. Confirm the repetition is not intentional before removing either.",
    });
  }

  /* ── long chains ───────────────────────────────────────────── */
  const actionNodes = ctx.ir.graph.nodes.filter((n) => n.type === "action");
  if (actionNodes.length > OPT_THRESHOLDS.longChainNodes) {
    out.push({
      id: recommendationId("LONG_CHAIN"),
      code: "LONG_CHAIN",
      category: "structure",
      priority: "P3",
      severity: "low",
      title: "Long sequential chain",
      evidence: `${actionNodes.length} action nodes run in sequence; observed average runtime ${m.performance.averageRuntimeMs ?? "unknown"}ms.`,
      expectedBenefit: "Shorter chains fail less and are easier to reason about.",
      estimatedImpact: {
        metric: "unquantified",
        value: null,
        unit: null,
        description: "Depends on how the workflow is split; no measured figure available.",
      },
      confidence,
      affectedNodes: actionNodes.map((n) => n.id),
      difficulty: "hard",
      risk: "high",
      reasoning: `${actionNodes.length} sequential nodes exceed the ${OPT_THRESHOLDS.longChainNodes}-node guidance. Splitting is a business-logic decision, so this is flagged for review rather than recommended outright.`,
    });
  }

  /* ── parallelization opportunity ───────────────────────────── */
  // Independent = consumes nothing from an upstream node. Only worth raising
  // when the chain is actually slow.
  const independent = actionNodes.filter(
    (n) => !Object.values(n.params).some((p) => p.source === "step"),
  );
  if (
    independent.length >= 2 &&
    m.performance.averageRuntimeMs !== null &&
    m.performance.averageRuntimeMs >= OPT_THRESHOLDS.longRuntimeMs
  ) {
    const savable = independent
      .map((n) => m.nodes.find((x) => x.nodeId === n.id)?.averageRuntimeMs ?? 0)
      .sort((a, b) => b - a)
      .slice(1) // the longest still has to run; the rest could overlap it
      .reduce((a, b) => a + b, 0);

    out.push({
      id: recommendationId("PARALLELIZATION_OPPORTUNITY"),
      code: "PARALLELIZATION_OPPORTUNITY",
      category: "structure",
      priority: "P3",
      severity: "low",
      title: "Independent nodes could run in parallel",
      evidence: `${independent.length} nodes (${independent.map((n) => n.id).join(", ")}) consume no upstream step output, yet run sequentially in a ${m.performance.averageRuntimeMs}ms average workflow.`,
      expectedBenefit: "Lower end-to-end latency without changing what each node does.",
      estimatedImpact:
        savable > 0
          ? {
              metric: "runtime",
              value: Math.round(savable),
              unit: "ms",
              description: `Overlapping the shorter independent nodes could save ~${Math.round(savable)}ms per execution.`,
            }
          : {
              metric: "unquantified",
              value: null,
              unit: null,
              description: "No per-node runtimes observed for these nodes.",
            },
      confidence,
      affectedNodes: independent.map((n) => n.id),
      difficulty: "hard",
      risk: "medium",
      reasoning:
        "These nodes read only from the trigger, so ordering between them is not a data dependency. Parallelising preserves each node's behaviour but changes execution shape — review before adopting.",
    });
  }

  return out;
}
