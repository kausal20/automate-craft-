/**
 * 9. Integration Validator — catalog compatibility.
 *
 * Verifies: every integration is a supported slug, every (integration,
 * operation) pair exists in the operation catalog, the operation permits the
 * step's kind, every used integration is declared in `core.integrations`, and
 * the core schema version is the one this build supports.
 */

import {
  WORKFLOW_SCHEMA_VERSION,
  isSupportedIntegration,
  lookupOperation,
} from "@/lib/workflow";
import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

export function validateIntegrations(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  // Core schema version compatibility.
  if (ir.core.schemaVersion !== WORKFLOW_SCHEMA_VERSION) {
    issues.push({
      code: "SCHEMA_VERSION_INCOMPATIBLE",
      severity: "error",
      category: "integration",
      message: `Core IR schema version ${ir.core.schemaVersion} is not supported (expected ${WORKFLOW_SCHEMA_VERSION}).`,
      recommendation: "Migrate or regenerate the workflow.",
    });
  }

  // Declared integrations must be real slugs.
  for (const integration of ir.core.integrations) {
    if (!isSupportedIntegration(integration)) {
      issues.push({
        code: "UNSUPPORTED_INTEGRATION",
        severity: "error",
        category: "integration",
        message: `"${integration}" is not a supported integration.`,
        affectedNode: integration,
        recommendation: `Remove "${integration}"; it is not in the catalog.`,
      });
    }
  }

  const declared = new Set(ir.core.integrations);

  // Trigger integration must be declared.
  const trigger = ir.core.trigger;
  if ("integration" in trigger && trigger.integration && !declared.has(trigger.integration)) {
    issues.push({
      code: "INTEGRATION_NOT_DECLARED",
      severity: "error",
      category: "integration",
      message: `Trigger uses "${trigger.integration}" but it is not declared in integrations[].`,
      affectedNode: "trigger",
      recommendation: `Add "${trigger.integration}" to the workflow integrations.`,
    });
  }

  for (const step of ir.core.steps) {
    // Step integration supported + declared.
    if (step.integration) {
      if (!isSupportedIntegration(step.integration)) {
        issues.push({
          code: "UNSUPPORTED_INTEGRATION",
          severity: "error",
          category: "integration",
          message: `Step "${step.id}" uses unsupported integration "${step.integration}".`,
          affectedNode: step.id,
          recommendation: `Use a catalog integration for "${step.id}".`,
        });
        continue;
      }
      if (!declared.has(step.integration)) {
        issues.push({
          code: "INTEGRATION_NOT_DECLARED",
          severity: "error",
          category: "integration",
          message: `Step "${step.id}" uses "${step.integration}" but it is not declared in integrations[].`,
          affectedNode: step.id,
          recommendation: `Add "${step.integration}" to the workflow integrations.`,
        });
      }
    }

    // Operation must exist in the catalog for this integration.
    const def = lookupOperation(step.integration ?? null, step.operation);
    if (!def) {
      issues.push({
        code: "UNSUPPORTED_OPERATION",
        severity: "error",
        category: "integration",
        message: `Operation "${step.operation}" is not defined for ${step.integration ?? "builtin"}.`,
        affectedNode: step.id,
        recommendation: `Use a catalog operation for ${step.integration ?? "builtin"}.`,
      });
      continue;
    }

    // The operation must permit this step kind.
    if (!def.kinds.includes(step.kind)) {
      issues.push({
        code: "UNSUPPORTED_OPERATION",
        severity: "error",
        category: "integration",
        message: `Operation "${step.operation}" cannot run as kind "${step.kind}" (allowed: ${def.kinds.join(", ")}).`,
        affectedNode: step.id,
        recommendation: `Set "${step.id}" kind to one of: ${def.kinds.join(", ")}.`,
      });
    }
  }

  // Declared but unused integrations — advisory.
  const used = new Set<string>();
  if ("integration" in trigger && trigger.integration) used.add(trigger.integration);
  for (const s of ir.core.steps) if (s.integration) used.add(s.integration);
  for (const declaredIntegration of declared) {
    if (!used.has(declaredIntegration)) {
      issues.push({
        code: "INTEGRATION_NOT_DECLARED",
        severity: "info",
        category: "integration",
        message: `Integration "${declaredIntegration}" is declared but never used.`,
        affectedNode: declaredIntegration,
        recommendation: `Remove the unused "${declaredIntegration}" declaration.`,
      });
    }
  }

  return issues;
}
