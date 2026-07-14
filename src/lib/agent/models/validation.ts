/**
 * Validator Agent report models.
 *
 * The Validator (Phase E) runs AFTER generation and BEFORE testing. It
 * INSPECTS the AgentWorkflowIR — it never modifies it. Eleven independent,
 * single-responsibility validators each return issues; the composer rolls them
 * into one ValidationReport with a deployment verdict.
 *
 * Deployment is BLOCKED while any issue of severity "error" exists.
 */

export type ValidationSeverity = "error" | "warning" | "info";

/** The pipeline stage that produced an issue. */
export type ValidationCategory =
  | "structure"
  | "schema"
  | "node"
  | "edge"
  | "dependency"
  | "variable"
  | "parameter"
  | "credential"
  | "integration"
  | "execution"
  | "deployment";

/** Stable codes so the UI + tests can assert on specific failures. */
export type ValidationIssueCode =
  // structure
  | "MISSING_TRIGGER"
  | "MISSING_ACTION"
  | "INVALID_METADATA"
  | "MISSING_VERSION"
  | "MISSING_GENERATOR_VERSION"
  | "UNSTABLE_NODE_ID"
  | "UNSTABLE_EDGE_ID"
  // schema
  | "SCHEMA_PARSE_FAILED"
  | "PLAN_LIMIT_EXCEEDED"
  // node
  | "NODE_NOT_FOUND"
  | "INVALID_RETRY_POLICY"
  | "INVALID_TIMEOUT_POLICY"
  | "INVALID_ERROR_POLICY"
  // edge / dependency
  | "ORPHAN_NODE"
  | "DANGLING_EDGE"
  | "DUPLICATE_EDGE"
  | "SELF_EDGE"
  | "CIRCULAR_DEPENDENCY"
  | "INVALID_EXECUTION_ORDER"
  | "NO_TERMINAL_STEP"
  // variable
  | "DANGLING_VARIABLE"
  | "INVALID_MAPPING"
  | "MISSING_OUTPUT"
  | "TYPE_MISMATCH"
  // parameter
  | "MISSING_REQUIRED_PARAM"
  | "INVALID_PARAM_VALUE"
  // credential
  | "CREDENTIAL_MISSING"
  | "CONNECTION_NOT_ACTIVE"
  | "CREDENTIAL_EXPIRED"
  // integration
  | "UNSUPPORTED_OPERATION"
  | "UNSUPPORTED_INTEGRATION"
  | "INTEGRATION_NOT_DECLARED"
  | "SCHEMA_VERSION_INCOMPATIBLE"
  // execution
  | "UNREACHABLE_NODE"
  | "DUPLICATE_ACTION"
  | "INVALID_TRANSITION"
  // deployment
  | "BLOCKED_BY_ERRORS"
  | "PLANNING_ISSUE_CARRIED";

export interface ValidationIssue {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  category: ValidationCategory;
  /** What failed. */
  message: string;
  /** Node / integration / param the issue concerns. */
  affectedNode?: string;
  /** How to fix it. Required for errors. */
  recommendation?: string;
}

/** Terminal verdict for the deploy gate. */
export type DeploymentStatus = "READY" | "READY_WITH_WARNINGS" | "BLOCKED";

export interface CategoryResult {
  category: ValidationCategory;
  passed: boolean;
  errorCount: number;
  warningCount: number;
}

export interface ValidationReport {
  sessionId: string;
  /** Revision of the AgentWorkflowIR that was validated. */
  irRevision: number;
  /** True only when zero "error"-severity issues exist. */
  ok: boolean;
  deploymentStatus: DeploymentStatus;
  /** 0–100. 100 = clean. Errors dominate. */
  score: number;
  issues: ValidationIssue[];
  categories: CategoryResult[];
  /** Deduped, ordered fix list derived from issue recommendations. */
  recommendations: string[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  createdAt: number;
}

const ALL_CATEGORIES: ValidationCategory[] = [
  "structure",
  "schema",
  "node",
  "edge",
  "dependency",
  "variable",
  "parameter",
  "credential",
  "integration",
  "execution",
  "deployment",
];

/**
 * Compose a report from a flat issue list.
 *
 * Score: 100 − 25/error − 5/warning, clamped to [0,100].
 * Status: BLOCKED on any error, READY_WITH_WARNINGS on any warning, else READY.
 * `createdAt` is supplied by the caller so the report can be made deterministic
 * in tests (the orchestrator passes wall-clock in production).
 */
export function buildValidationReport(
  sessionId: string,
  issues: ValidationIssue[],
  options: { irRevision: number; createdAt: number },
): ValidationReport {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  const ok = errorCount === 0;
  const deploymentStatus: DeploymentStatus = !ok
    ? "BLOCKED"
    : warningCount > 0
      ? "READY_WITH_WARNINGS"
      : "READY";

  const score = Math.max(0, Math.min(100, 100 - errorCount * 25 - warningCount * 5));

  const categories: CategoryResult[] = ALL_CATEGORIES.map((category) => {
    const inCat = issues.filter((i) => i.category === category);
    const errors = inCat.filter((i) => i.severity === "error").length;
    const warnings = inCat.filter((i) => i.severity === "warning").length;
    return { category, passed: errors === 0, errorCount: errors, warningCount: warnings };
  });

  // Errors first, then warnings; deduped, order-stable.
  const recommendations: string[] = [];
  const seen = new Set<string>();
  for (const sev of ["error", "warning"] as const) {
    for (const i of issues) {
      if (i.severity !== sev || !i.recommendation) continue;
      if (seen.has(i.recommendation)) continue;
      seen.add(i.recommendation);
      recommendations.push(i.recommendation);
    }
  }

  return {
    sessionId,
    irRevision: options.irRevision,
    ok,
    deploymentStatus,
    score,
    issues,
    categories,
    recommendations,
    summary: { errorCount, warningCount, infoCount },
    createdAt: options.createdAt,
  };
}
