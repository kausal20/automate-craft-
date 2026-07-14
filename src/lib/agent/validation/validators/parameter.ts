/**
 * 7. Parameter Validator — every operation gets the params it needs.
 *
 * Authoritative source is the operation catalog (requiredParams), cross-checked
 * against the node's actual params. The generator's `schemas.nodes[].missingParams`
 * is a convenience view; this validator re-derives from the catalog so a stale
 * or hand-edited IR cannot slip through.
 */

import { lookupOperation } from "@/lib/workflow";
import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

export function validateParameters(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  for (const step of ir.core.steps) {
    const def = step.integration
      ? lookupOperation(step.integration, step.operation)
      : lookupOperation(null, step.operation);

    // Unknown operations are reported by the Integration validator.
    if (!def) continue;

    const provided = Object.keys(step.params);
    for (const required of def.requiredParams) {
      if (!provided.includes(required)) {
        issues.push({
          code: "MISSING_REQUIRED_PARAM",
          severity: "error",
          category: "parameter",
          message: `Step "${step.id}" (${step.operation}) is missing required parameter "${required}".`,
          affectedNode: step.id,
          recommendation: `Provide "${required}" for ${step.integration ?? "builtin"}.${step.operation}.`,
        });
      }
    }

    // Empty literal values for required params mean "unresolved".
    for (const [key, ref] of Object.entries(step.params)) {
      if (
        ref.source === "literal" &&
        ref.value.trim() === "" &&
        def.requiredParams.includes(key)
      ) {
        issues.push({
          code: "INVALID_PARAM_VALUE",
          severity: "error",
          category: "parameter",
          message: `Step "${step.id}" has an empty value for required parameter "${key}".`,
          affectedNode: step.id,
          recommendation: `Supply a value for "${key}" on "${step.id}".`,
        });
      }
    }

    // Params the operation does not declare are tolerated but surfaced.
    const known = new Set(def.requiredParams);
    for (const key of provided) {
      if (!known.has(key)) {
        issues.push({
          code: "INVALID_PARAM_VALUE",
          severity: "info",
          category: "parameter",
          message: `Step "${step.id}" supplies "${key}", which ${step.operation} does not require.`,
          affectedNode: step.id,
          recommendation: `Confirm "${key}" is intended for ${step.operation}.`,
        });
      }
    }
  }

  return issues;
}
