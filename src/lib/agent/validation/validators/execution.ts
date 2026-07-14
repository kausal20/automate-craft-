/**
 * 10. Execution Validator — the graph can actually run.
 *
 * Verifies: every node is reachable from the trigger, `core.steps[].next`
 * agrees with the graph edges, condition steps branch and others don't, and no
 * two nodes perform an identical action.
 */

import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

export function validateExecution(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  const nodeIds = new Set(ir.graph.nodes.map((n) => n.id));

  /* ── reachability from the trigger ─────────────────────────── */
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  for (const e of ir.graph.edges) {
    if (nodeIds.has(e.from) && nodeIds.has(e.to)) adjacency.get(e.from)!.push(e.to);
  }

  const root = ir.graph.nodes.find((n) => n.type === "trigger")?.id;
  if (root) {
    const reachable = new Set<string>([root]);
    const queue = [root];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of adjacency.get(current) ?? []) {
        if (reachable.has(next)) continue;
        reachable.add(next);
        queue.push(next);
      }
    }
    for (const n of ir.graph.nodes) {
      if (!reachable.has(n.id)) {
        issues.push({
          code: "UNREACHABLE_NODE",
          severity: "error",
          category: "execution",
          message: `Node "${n.id}" is not reachable from the trigger.`,
          affectedNode: n.id,
          recommendation: `Connect "${n.id}" to the flow or remove it.`,
        });
      }
    }
  }

  /* ── core.next must agree with the graph edges ─────────────── */
  const edgePairs = new Set(ir.graph.edges.map((e) => `${e.from}→${e.to}`));
  for (const step of ir.core.steps) {
    for (const next of step.next) {
      if (!edgePairs.has(`${step.id}→${next}`)) {
        issues.push({
          code: "INVALID_TRANSITION",
          severity: "error",
          category: "execution",
          message: `Step "${step.id}" declares next "${next}" with no matching graph edge.`,
          affectedNode: step.id,
          recommendation: "Regenerate the workflow; core and graph disagree.",
        });
      }
    }

    /* ── branching rules ────────────────────────────────────── */
    if (step.kind === "condition" && step.next.length < 2) {
      issues.push({
        code: "INVALID_TRANSITION",
        severity: "error",
        category: "execution",
        message: `Condition step "${step.id}" has ${step.next.length} branch(es); it needs at least 2.`,
        affectedNode: step.id,
        recommendation: `Give "${step.id}" both a true and a false branch.`,
      });
    }
    if (step.kind !== "condition" && step.next.length > 1) {
      issues.push({
        code: "INVALID_TRANSITION",
        severity: "error",
        category: "execution",
        message: `Step "${step.id}" (kind "${step.kind}") has ${step.next.length} outgoing edges; only condition steps may branch.`,
        affectedNode: step.id,
        recommendation: `Reduce "${step.id}" to one outgoing edge or make it a condition.`,
      });
    }
  }

  /* ── duplicate actions ─────────────────────────────────────── */
  const signatures = new Map<string, string>();
  for (const step of ir.core.steps) {
    const signature = `${step.integration ?? "builtin"}.${step.operation}:${JSON.stringify(
      Object.keys(step.params)
        .sort()
        .map((k) => [k, step.params[k]]),
    )}`;
    const previous = signatures.get(signature);
    if (previous) {
      issues.push({
        code: "DUPLICATE_ACTION",
        severity: "warning",
        category: "execution",
        message: `Step "${step.id}" performs the same action as "${previous}".`,
        affectedNode: step.id,
        recommendation: `Remove the redundant step "${step.id}".`,
      });
    } else {
      signatures.set(signature, step.id);
    }
  }

  return issues;
}
