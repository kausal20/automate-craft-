/**
 * 6. Variable Validator — variables and mappings resolve.
 *
 * Verifies: every mapping targets a real node, trigger/step mappings bind to a
 * declared variable, step-sourced variables are produced by an UPSTREAM node
 * (no forward/dangling references), variable types come from the closed
 * vocabulary, and every declared variable is actually produced.
 */

import type { IRVariableType } from "../../models/workflow-ir";
import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

const VARIABLE_TYPES: IRVariableType[] = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "unknown",
];

export function validateVariables(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  const nodeById = new Map(ir.graph.nodes.map((n) => [n.id, n]));
  const variableById = new Map(ir.variables.map((v) => [v.id, v]));

  /* ── variables ─────────────────────────────────────────────── */
  for (const v of ir.variables) {
    if (!VARIABLE_TYPES.includes(v.type)) {
      issues.push({
        code: "TYPE_MISMATCH",
        severity: "error",
        category: "variable",
        message: `Variable "${v.id}" has unknown type "${v.type}".`,
        affectedNode: v.producedBy,
        recommendation: `Use one of: ${VARIABLE_TYPES.join(", ")}.`,
      });
    }
    // The producer must exist ("trigger" is a real node in the graph).
    if (!nodeById.has(v.producedBy)) {
      issues.push({
        code: "MISSING_OUTPUT",
        severity: "error",
        category: "variable",
        message: `Variable "${v.id}" is produced by "${v.producedBy}", which is not a node.`,
        affectedNode: v.producedBy,
        recommendation: `Remove the variable or restore node "${v.producedBy}".`,
      });
    }
  }

  /* ── mappings ──────────────────────────────────────────────── */
  for (const m of ir.mappings) {
    const node = nodeById.get(m.nodeId);
    if (!node) {
      issues.push({
        code: "INVALID_MAPPING",
        severity: "error",
        category: "variable",
        message: `Mapping "${m.id}" targets node "${m.nodeId}", which does not exist.`,
        affectedNode: m.nodeId,
        recommendation: "Regenerate the workflow; mappings must target real nodes.",
      });
      continue;
    }

    if (m.source === "trigger" || m.source === "step") {
      if (!m.variableId) {
        issues.push({
          code: "DANGLING_VARIABLE",
          severity: "error",
          category: "variable",
          message: `Mapping "${m.id}" reads ${m.source} "${m.ref}" but binds to no variable.`,
          affectedNode: m.nodeId,
          recommendation: `Ensure "${m.ref}" is produced upstream of "${m.nodeId}".`,
        });
        continue;
      }
      const variable = variableById.get(m.variableId);
      if (!variable) {
        issues.push({
          code: "DANGLING_VARIABLE",
          severity: "error",
          category: "variable",
          message: `Mapping "${m.id}" references unknown variable "${m.variableId}".`,
          affectedNode: m.nodeId,
          recommendation: "Regenerate the workflow; the mapping points at a missing variable.",
        });
        continue;
      }

      // Step-sourced values must come from a node that runs EARLIER.
      if (m.source === "step") {
        const producer = nodeById.get(variable.producedBy);
        if (producer && producer.executionOrder >= node.executionOrder) {
          issues.push({
            code: "INVALID_MAPPING",
            severity: "error",
            category: "variable",
            message: `Node "${node.id}" reads output of "${producer.id}", which does not run earlier.`,
            affectedNode: node.id,
            recommendation: `Reorder so "${producer.id}" runs before "${node.id}".`,
          });
        }
      }
    }

    // literal/template carry a value; secret carries a ref.
    if ((m.source === "literal" || m.source === "template") && m.value === null) {
      issues.push({
        code: "INVALID_MAPPING",
        severity: "error",
        category: "variable",
        message: `Mapping "${m.id}" is a ${m.source} but carries no value.`,
        affectedNode: m.nodeId,
        recommendation: `Provide a value for "${m.param}" on "${m.nodeId}".`,
      });
    }
    if (m.source === "secret" && !m.ref) {
      issues.push({
        code: "INVALID_MAPPING",
        severity: "error",
        category: "variable",
        message: `Mapping "${m.id}" is a secret but carries no reference.`,
        affectedNode: m.nodeId,
        recommendation: `Provide a credential reference for "${m.param}".`,
      });
    }
  }

  return issues;
}
