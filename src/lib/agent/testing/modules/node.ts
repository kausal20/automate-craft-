/**
 * 3. Node Testing — each node judged independently from the simulation.
 *
 * Produces the per-node PASS / FAIL / WARNING result with estimated execution
 * time, reason and recommendation.
 */

import type { NodeTestResult, TestIssue } from "../../models/testing";
import { SLOW_NODE_THRESHOLD_MS } from "../latency";
import type { TestingContext } from "../context";

export interface NodeTestingOutput {
  results: NodeTestResult[];
  issues: TestIssue[];
}

export function testNodes(ctx: TestingContext): NodeTestingOutput {
  const results: NodeTestResult[] = [];
  const issues: TestIssue[] = [];

  for (const sim of ctx.simulation.nodes) {
    const { node } = sim;

    if (!sim.reachable) {
      results.push({
        nodeId: node.id,
        label: node.metadata.label,
        status: "FAIL",
        resolvedInputs: sim.resolvedInputs,
        simulatedOutput: null,
        estimatedMs: sim.estimatedMs,
        reason: "Node is not reachable from the trigger.",
        recommendation: `Connect "${node.id}" to the execution graph or remove it.`,
      });
      issues.push({
        code: "UNREACHABLE_NODE",
        severity: "error",
        module: "node",
        message: `Node "${node.id}" never runs — it is unreachable from the trigger.`,
        affectedNode: node.id,
        recommendation: `Connect "${node.id}" to the execution graph or remove it.`,
      });
      continue;
    }

    if (sim.unresolved.length > 0) {
      const reason = sim.unresolved
        .map((u) => `${u.param}: ${u.reason}`)
        .join("; ");
      results.push({
        nodeId: node.id,
        label: node.metadata.label,
        status: "FAIL",
        resolvedInputs: sim.resolvedInputs,
        simulatedOutput: null,
        estimatedMs: sim.estimatedMs,
        reason: `Unresolved input(s) — ${reason}.`,
        recommendation: `Supply or remap: ${sim.unresolved.map((u) => u.param).join(", ")}.`,
      });
      for (const u of sim.unresolved) {
        issues.push({
          code: "UNRESOLVED_REFERENCE",
          severity: "error",
          module: "node",
          message: `Node "${node.id}" cannot resolve "${u.param}": ${u.reason}.`,
          affectedNode: node.id,
          recommendation: `Supply a value for "${u.param}" on "${node.id}" or fix its mapping.`,
        });
      }
      continue;
    }

    // Slow but functional.
    const slow = sim.estimatedMs >= SLOW_NODE_THRESHOLD_MS;
    results.push({
      nodeId: node.id,
      label: node.metadata.label,
      status: slow ? "WARNING" : "PASS",
      resolvedInputs: sim.resolvedInputs,
      simulatedOutput: sim.output,
      estimatedMs: sim.estimatedMs,
      ...(slow
        ? {
            reason: `Estimated ${sim.estimatedMs}ms — at or above the ${SLOW_NODE_THRESHOLD_MS}ms bottleneck threshold.`,
            recommendation: `Expect latency from "${node.id}" (${node.integration}).`,
          }
        : {}),
    });
  }

  return { results, issues };
}
