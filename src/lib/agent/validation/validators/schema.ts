/**
 * 2. Schema Validator — the canonical core conforms to the IR schema.
 *
 * Runs the authoritative Zod schema (`workflowIRSchema`) over `ir.core` and
 * converts every Zod issue into a ValidationIssue (collect-all, unlike the
 * throwing validators in @/lib/workflow which stop at the first failure).
 * Also enforces plan-tier size limits and IR schema-version compatibility.
 */

import { getPlanLimits, workflowIRSchema } from "@/lib/workflow";
import { AGENT_IR_SCHEMA_VERSION } from "../../models/workflow-ir";
import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

export function validateSchema(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  const parsed = workflowIRSchema.safeParse(ir.core);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      issues.push({
        code: "SCHEMA_PARSE_FAILED",
        severity: "error",
        category: "schema",
        message: `Canonical IR schema violation at "${path || "(root)"}": ${issue.message}`,
        affectedNode: path || undefined,
        recommendation: "Regenerate the workflow; the IR core must satisfy the canonical schema.",
      });
    }
  }

  // Document schema-version compatibility (migration gate).
  if (ir.irSchemaVersion !== AGENT_IR_SCHEMA_VERSION) {
    issues.push({
      code: "SCHEMA_VERSION_INCOMPATIBLE",
      severity: "error",
      category: "schema",
      message: `IR document schema version ${ir.irSchemaVersion} is not supported (expected ${AGENT_IR_SCHEMA_VERSION}).`,
      recommendation: "Migrate or regenerate the workflow with the current generator.",
    });
  }

  // Plan-tier size limits.
  const limits = getPlanLimits(ctx.plan);
  if (ir.core.steps.length > limits.maxSteps) {
    issues.push({
      code: "PLAN_LIMIT_EXCEEDED",
      severity: "error",
      category: "schema",
      message: `Workflow has ${ir.core.steps.length} steps; the ${ctx.plan} plan allows ${limits.maxSteps}.`,
      recommendation: `Reduce the workflow to ${limits.maxSteps} steps or upgrade the plan.`,
    });
  }
  if (ir.core.integrations.length > limits.maxIntegrations) {
    issues.push({
      code: "PLAN_LIMIT_EXCEEDED",
      severity: "error",
      category: "schema",
      message: `Workflow uses ${ir.core.integrations.length} integrations; the ${ctx.plan} plan allows ${limits.maxIntegrations}.`,
      recommendation: `Reduce integrations to ${limits.maxIntegrations} or upgrade the plan.`,
    });
  }

  return issues;
}
