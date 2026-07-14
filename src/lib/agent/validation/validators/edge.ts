/**
 * 4. Edge Validator — edges reference real nodes, exactly once, never self.
 *
 * Orphan detection lives here too: every non-trigger node must be reachable
 * by at least one incoming edge.
 */

import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

export function validateEdges(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  const nodeIds = new Set(ir.graph.nodes.map((n) => n.id));
  const seenPairs = new Set<string>();
  const incoming = new Set<string>();

  for (const e of ir.graph.edges) {
    // Dangling endpoints.
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) {
      issues.push({
        code: "DANGLING_EDGE",
        severity: "error",
        category: "edge",
        message: `Edge "${e.id}" references a node that does not exist (${e.from} → ${e.to}).`,
        affectedNode: e.id,
        recommendation: "Regenerate the workflow; every edge must connect existing nodes.",
      });
      continue;
    }

    // Self edge.
    if (e.from === e.to) {
      issues.push({
        code: "SELF_EDGE",
        severity: "error",
        category: "edge",
        message: `Edge "${e.id}" connects node "${e.from}" to itself.`,
        affectedNode: e.id,
        recommendation: `Remove the self-referencing edge on "${e.from}".`,
      });
      continue;
    }

    // Duplicate pair.
    const pair = `${e.from}→${e.to}`;
    if (seenPairs.has(pair)) {
      issues.push({
        code: "DUPLICATE_EDGE",
        severity: "error",
        category: "edge",
        message: `Duplicate edge ${pair}.`,
        affectedNode: e.id,
        recommendation: "Remove the duplicate edge.",
      });
      continue;
    }
    seenPairs.add(pair);
    incoming.add(e.to);
  }

  // Orphans: non-trigger nodes with no incoming edge.
  for (const n of ir.graph.nodes) {
    if (n.type === "trigger") continue;
    if (!incoming.has(n.id)) {
      issues.push({
        code: "ORPHAN_NODE",
        severity: "error",
        category: "edge",
        message: `Node "${n.id}" has no incoming edge and can never run.`,
        affectedNode: n.id,
        recommendation: `Connect "${n.id}" to the execution graph or remove it.`,
      });
    }
  }

  return issues;
}
