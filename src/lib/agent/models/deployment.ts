/**
 * Deployment Agent report models (Phase G).
 *
 * The Deployment Agent compiles a validated + tested Workflow IR into an
 * executable n8n workflow, uploads it, verifies it, activates it, and reports.
 * It never modifies the IR — the IR stays the single source of truth.
 *
 * Honesty rules encoded here:
 *   - `activationStatus` reflects what n8n actually reported, never an
 *     assumption. A workflow that uploaded but failed to activate is
 *     PARTIAL/ROLLED_BACK, never DEPLOYED.
 *   - Every failure carries a structured code + recommendation.
 *   - `durationMs` is real wall-clock, so a DeploymentReport is NOT
 *     byte-deterministic (unlike the compiler, which is). Determinism is
 *     asserted at the compiler layer.
 */

import type { N8nWorkflow } from "@/lib/adapters/n8n/client/types";

/** Bumped when compilation output changes in a way that alters n8n JSON. */
export const COMPILER_VERSION = "1.0.0" as const;

/**
 * Result of a deployment attempt. Distinct from the Validator's
 * `DeploymentStatus` (READY / BLOCKED), which is a pre-deploy READINESS
 * verdict — this is the OUTCOME of actually deploying.
 */
export type DeploymentOutcome =
  | "DEPLOYED"
  | "PARTIAL"
  | "ROLLED_BACK"
  | "FAILED";

export type ActivationStatus = "ACTIVE" | "INACTIVE" | "PAUSED" | "UNKNOWN";

/** Lifecycle operation that produced this report. */
export type DeploymentOperation =
  | "CREATE"
  | "UPDATE"
  | "REDEPLOY"
  | "PAUSE"
  | "RESUME"
  | "DEACTIVATE"
  | "DELETE";

export type DeploymentErrorCode =
  | "COMPILATION_FAILED"
  | "CREDENTIAL_MISSING"
  | "CREDENTIAL_RESOLUTION_FAILED"
  | "NOT_CONFIGURED"
  | "AUTHENTICATION_FAILED"
  | "NETWORK_FAILURE"
  | "API_FAILURE"
  | "TIMEOUT"
  | "UPLOAD_FAILED"
  | "VERIFICATION_FAILED"
  | "ACTIVATION_FAILED"
  | "PARTIAL_DEPLOYMENT"
  | "ROLLBACK_FAILED"
  | "NOT_DEPLOYED"
  | "PRECONDITION_FAILED";

export interface DeploymentIssue {
  code: DeploymentErrorCode;
  severity: "error" | "warning";
  message: string;
  /** Node / integration the failure concerns, when applicable. */
  affectedNode?: string;
  recommendation: string;
}

export interface RollbackReport {
  attempted: boolean;
  succeeded: boolean;
  /** What the rollback actually did, in order. */
  actions: string[];
  /** Revision restored, when a previous deployment existed. */
  restoredRevision: number | null;
  reason: string;
}

export interface DeploymentReport {
  sessionId: string;
  operation: DeploymentOperation;
  status: DeploymentOutcome;

  /** n8n's workflow id. Null when nothing was uploaded. */
  workflowId: string | null;
  /** Our deployment record id. */
  deploymentId: string;
  /** IR revision that was deployed. */
  revision: number;

  activationStatus: ActivationStatus;
  /** Real wall-clock duration of the deployment attempt. */
  durationMs: number;

  errors: DeploymentIssue[];
  warnings: DeploymentIssue[];
  recommendations: string[];

  /** Reported by n8n when it exposes a version; null when unknown. */
  n8nVersion: string | null;
  compilerVersion: string;

  /** Present only when a rollback was triggered. */
  rollback: RollbackReport | null;

  /** The compiled JSON that was uploaded, for audit. Null on compile failure. */
  compiled: N8nWorkflow | null;

  createdAt: number;
}

/** Compose a report, deriving status/recommendations from the issues. */
export function buildDeploymentReport(input: {
  sessionId: string;
  operation: DeploymentOperation;
  deploymentId: string;
  revision: number;
  workflowId: string | null;
  activationStatus: ActivationStatus;
  durationMs: number;
  issues: DeploymentIssue[];
  n8nVersion: string | null;
  rollback: RollbackReport | null;
  compiled: N8nWorkflow | null;
  createdAt: number;
}): DeploymentReport {
  const errors = input.issues.filter((i) => i.severity === "error");
  const warnings = input.issues.filter((i) => i.severity === "warning");

  let status: DeploymentOutcome;
  if (errors.length === 0) {
    status = "DEPLOYED";
  } else if (input.rollback?.attempted) {
    status = input.rollback.succeeded ? "ROLLED_BACK" : "PARTIAL";
  } else if (input.workflowId) {
    // Uploaded but did not finish cleanly, and nothing was rolled back.
    status = "PARTIAL";
  } else {
    status = "FAILED";
  }

  const recommendations: string[] = [];
  const seen = new Set<string>();
  for (const i of [...errors, ...warnings]) {
    if (seen.has(i.recommendation)) continue;
    seen.add(i.recommendation);
    recommendations.push(i.recommendation);
  }

  return {
    sessionId: input.sessionId,
    operation: input.operation,
    status,
    workflowId: input.workflowId,
    deploymentId: input.deploymentId,
    revision: input.revision,
    activationStatus: input.activationStatus,
    durationMs: input.durationMs,
    errors,
    warnings,
    recommendations,
    n8nVersion: input.n8nVersion,
    compilerVersion: COMPILER_VERSION,
    rollback: input.rollback,
    compiled: input.compiled,
    createdAt: input.createdAt,
  };
}
