/**
 * 5. Dependency Validator — the graph is acyclic and its declared execution
 * order is consistent with the edges.
 *
 * Reuses the planner's Kahn topological sort (single implementation, no
 * duplicate graph logic).
 */

import { topoSort, type DagEdge } from "../../planning/dag";
import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

export function validateDependencies(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  const nodeIds = ir.graph.nodes.map((n) => n.id);
  const edges: DagEdge[] = ir.graph.edges
    .filter((e) => nodeIds.includes(e.from) && nodeIds.includes(e.to))
    .map((e) => ({ from: e.from, to: e.to }));

  const topo = topoSort(nodeIds, edges);

  if (!topo.acyclic) {
    issues.push({
      code: "CIRCULAR_DEPENDENCY",
      severity: "error",
      category: "dependency",
      message: `Execution graph contains a cycle involving: ${topo.cycleNodes.join(", ")}.`,
      affectedNode: topo.cycleNodes[0],
      recommendation: "Break the circular dependency between these nodes.",
    });
    // Order checks are meaningless on a cyclic graph.
    return issues;
  }

  // Declared node.executionOrder must be consistent with topological order:
  // every dependency must come strictly earlier.
  const orderOf = new Map(ir.graph.nodes.map((n) => [n.id, n.executionOrder]));
  for (const n of ir.graph.nodes) {
    for (const dep of n.dependencies) {
      const depOrder = orderOf.get(dep);
      if (depOrder === undefined) {
        issues.push({
          code: "DANGLING_EDGE",
          severity: "error",
          category: "dependency",
          message: `Node "${n.id}" depends on "${dep}", which does not exist.`,
          affectedNode: n.id,
          recommendation: `Remove the dependency on "${dep}" or restore that node.`,
        });
        continue;
      }
      if (depOrder >= n.executionOrder) {
        issues.push({
          code: "INVALID_EXECUTION_ORDER",
          severity: "error",
          category: "dependency",
          message: `Node "${n.id}" (order ${n.executionOrder}) runs before its dependency "${dep}" (order ${depOrder}).`,
          affectedNode: n.id,
          recommendation: "Regenerate the workflow to restore a valid execution order.",
        });
      }
    }
  }

  // At least one terminal node (no outgoing edges).
  const hasOutgoing = new Set(edges.map((e) => e.from));
  const terminals = nodeIds.filter((id) => !hasOutgoing.has(id));
  if (nodeIds.length > 0 && terminals.length === 0) {
    issues.push({
      code: "NO_TERMINAL_STEP",
      severity: "error",
      category: "dependency",
      message: "The workflow has no terminal node; it can never complete.",
      recommendation: "Ensure at least one node has no outgoing edge.",
    });
  }

  return issues;
}
