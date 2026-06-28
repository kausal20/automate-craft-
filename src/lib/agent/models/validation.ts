/**
 * Validator Agent report models.
 *
 * The validator (Phase E) runs AFTER generation and BEFORE testing. It
 * wraps the existing pure IR validators (graph integrity, integration
 * coherence, plan limits, step ordering) AND adds agent-level checks the
 * IR layer can't see: credential availability, connection status,
 * duplicate-action detection.
 *
 * Output is a ValidationReport. Deployment is blocked while any issue of
 * severity "error" exists.
 */

export type ValidationSeverity = "error" | "warning" | "info";

/** Stable codes so the UI + tests can assert on specific failures. */
export type ValidationIssueCode =
  | "MISSING_TRIGGER"
  | "MISSING_ACTION"
  | "MISSING_REQUIRED_PARAM"
  | "UNSUPPORTED_OPERATION"
  | "UNSUPPORTED_INTEGRATION"
  | "INTEGRATION_NOT_DECLARED"
  | "CREDENTIAL_MISSING"
  | "CONNECTION_NOT_ACTIVE"
  | "CIRCULAR_DEPENDENCY"
  | "DUPLICATE_ACTION"
  | "INVALID_MAPPING"
  | "INVALID_TRANSITION"
  | "PLAN_LIMIT_EXCEEDED"
  | "DANGLING_EDGE"
  | "NO_TERMINAL_STEP";

export interface ValidationIssue {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  /** What failed. */
  message: string;
  /** Where — step id, integration slug, param key. */
  target?: string;
  /** How to fix it. Required for errors. */
  recommendation?: string;
}

export interface ValidationReport {
  sessionId: string;
  /** True only when zero "error"-severity issues exist. */
  ok: boolean;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  createdAt: number;
}

/** Build a report from a flat issue list, computing ok + counts. */
export function buildValidationReport(
  sessionId: string,
  issues: ValidationIssue[],
): ValidationReport {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;
  return {
    sessionId,
    ok: errorCount === 0,
    issues,
    summary: { errorCount, warningCount, infoCount },
    createdAt: Date.now(),
  };
}
