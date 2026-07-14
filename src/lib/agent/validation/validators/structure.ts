/**
 * 1. Structure Validator — the IR document is well-formed.
 *
 * Verifies: trigger present, at least one action, metadata sane, versions
 * present, node/edge ids stable (derived + unique).
 */

import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

const STABLE_ID_RE = /^[a-z][a-z0-9_]*$/;
const STABLE_EDGE_ID_RE = /^e_[a-z0-9_]+__[a-z0-9_]+$/;

export function validateStructure(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  if (!ir.core?.trigger) {
    issues.push({
      code: "MISSING_TRIGGER",
      severity: "error",
      category: "structure",
      message: "The workflow has no trigger.",
      recommendation: "Regenerate the workflow with a trigger.",
    });
  }

  const actionNodes = ir.graph.nodes.filter((n) => n.type === "action");
  if (actionNodes.length === 0) {
    issues.push({
      code: "MISSING_ACTION",
      severity: "error",
      category: "structure",
      message: "The workflow has no action nodes.",
      recommendation: "Add at least one action the workflow should perform.",
    });
  }

  if (!ir.metadata?.name?.trim() || !ir.metadata?.description?.trim()) {
    issues.push({
      code: "INVALID_METADATA",
      severity: "error",
      category: "structure",
      message: "Workflow metadata is missing a name or description.",
      recommendation: "Regenerate the workflow so metadata is populated.",
    });
  }

  if (typeof ir.revision !== "number" || ir.revision < 1) {
    issues.push({
      code: "MISSING_VERSION",
      severity: "error",
      category: "structure",
      message: "The IR document has no valid revision number.",
      recommendation: "Regenerate the workflow to stamp a revision.",
    });
  }

  if (!ir.generatorVersion?.trim()) {
    issues.push({
      code: "MISSING_GENERATOR_VERSION",
      severity: "error",
      category: "structure",
      message: "The IR document has no generator version.",
      recommendation: "Regenerate the workflow with a current generator.",
    });
  }

  // Stable, unique ids.
  const nodeIds = new Set<string>();
  for (const n of ir.graph.nodes) {
    if (!STABLE_ID_RE.test(n.id)) {
      issues.push({
        code: "UNSTABLE_NODE_ID",
        severity: "error",
        category: "structure",
        message: `Node id "${n.id}" is not a stable snake_case identifier.`,
        affectedNode: n.id,
        recommendation: "Regenerate the workflow to derive stable node ids.",
      });
    }
    if (nodeIds.has(n.id)) {
      issues.push({
        code: "UNSTABLE_NODE_ID",
        severity: "error",
        category: "structure",
        message: `Duplicate node id "${n.id}".`,
        affectedNode: n.id,
        recommendation: "Regenerate the workflow; node ids must be unique.",
      });
    }
    nodeIds.add(n.id);
  }

  const edgeIds = new Set<string>();
  for (const e of ir.graph.edges) {
    if (!STABLE_EDGE_ID_RE.test(e.id)) {
      issues.push({
        code: "UNSTABLE_EDGE_ID",
        severity: "error",
        category: "structure",
        message: `Edge id "${e.id}" does not follow the derived e_<from>__<to> form.`,
        affectedNode: e.id,
        recommendation: "Regenerate the workflow to derive stable edge ids.",
      });
    }
    if (edgeIds.has(e.id)) {
      issues.push({
        code: "UNSTABLE_EDGE_ID",
        severity: "error",
        category: "structure",
        message: `Duplicate edge id "${e.id}".`,
        affectedNode: e.id,
        recommendation: "Regenerate the workflow; edge ids must be unique.",
      });
    }
    edgeIds.add(e.id);
  }

  return issues;
}
