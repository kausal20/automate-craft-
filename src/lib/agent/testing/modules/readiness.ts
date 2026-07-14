/**
 * 12. Deployment Readiness Testing — the final gate.
 *
 * Runs LAST and sees every other module's findings. It does not re-check their
 * concerns; it decides what those findings mean for deploying, and refuses to
 * bless a workflow whose Validator report was BLOCKED.
 */

import type { TestIssue } from "../../models/testing";
import type { TestingContext } from "../context";

export function testDeploymentReadiness(
  ctx: TestingContext,
  priorIssues: readonly TestIssue[],
): TestIssue[] {
  const issues: TestIssue[] = [];

  // A workflow the Validator blocked must never be reported as testable-and-ready.
  const validation = ctx.validation;
  if (validation && validation.deploymentStatus === "BLOCKED") {
    issues.push({
      code: "VALIDATION_BLOCKED",
      severity: "error",
      module: "readiness",
      message: `Validation blocked this workflow (${validation.summary.errorCount} error(s)); it is not deployable regardless of test results.`,
      recommendation: "Resolve the blocking validation errors, then re-validate and re-test.",
    });
  }

  const failures = priorIssues.filter((i) => i.severity === "error");
  if (failures.length > 0) {
    const modules = [...new Set(failures.map((i) => i.module))].sort();
    issues.push({
      code: "TESTS_FAILED",
      severity: "error",
      module: "readiness",
      message: `${failures.length} test failure(s) across: ${modules.join(", ")}.`,
      recommendation: "Fix every failing test before deploying.",
    });
  }

  return issues;
}
