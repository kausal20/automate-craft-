/**
 * 11. Deployment Readiness Validator — final gate.
 *
 * Runs LAST and sees the issues raised by the other ten. It does not re-check
 * their concerns; it decides what those findings mean for deploying, and
 * carries forward blocking planning issues that survived into the IR.
 */

import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

export function validateDeploymentReadiness(
  ctx: ValidatorContext,
  priorIssues: readonly ValidationIssue[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  const errors = priorIssues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    const categories = [...new Set(errors.map((i) => i.category))].sort();
    issues.push({
      code: "BLOCKED_BY_ERRORS",
      severity: "error",
      category: "deployment",
      message: `Deployment blocked by ${errors.length} error(s) in: ${categories.join(", ")}.`,
      recommendation: "Resolve every blocking error, then re-validate.",
    });
  }

  // Blocking planning issues must not be silently inherited by the IR.
  for (const planIssue of ir.metadata.planningIssues) {
    if (planIssue.severity !== "error") continue;
    issues.push({
      code: "PLANNING_ISSUE_CARRIED",
      severity: "error",
      category: "deployment",
      message: `Unresolved planning error carried into the IR: ${planIssue.code} — ${planIssue.message}`,
      affectedNode: planIssue.target,
      recommendation:
        planIssue.recommendation ?? "Re-plan the workflow to resolve this issue.",
    });
  }

  // Low planner confidence is advisory, never blocking.
  if (ir.metadata.confidence < 70) {
    issues.push({
      code: "PLANNING_ISSUE_CARRIED",
      severity: "warning",
      category: "deployment",
      message: `Planner confidence was ${ir.metadata.confidence}/100 for this workflow.`,
      recommendation: "Confirm the planning assumptions before deploying.",
    });
  }

  return issues;
}
