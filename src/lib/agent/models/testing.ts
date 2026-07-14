/**
 * Testing Agent report models (Phase F).
 *
 * The Testing Agent SIMULATES a validated Workflow IR before deployment. It
 * never deploys, never mutates the IR, and never performs a destructive call.
 *
 * Honesty rules encoded here:
 *   - A node whose refs cannot resolve is FAIL, never a silent skip.
 *   - A check that was not actually performed (no live probe) is SKIPPED with a
 *     reason — never PASS.
 *   - Timings are deterministic ESTIMATES (see testing/latency.ts), not
 *     measured wall-clock, so the report stays reproducible.
 */

export type TestStatus = "PASS" | "FAIL" | "WARNING" | "SKIPPED";

/** The twelve single-responsibility test modules. */
export type TestModule =
  | "execution"
  | "trigger"
  | "node"
  | "variable"
  | "mapping"
  | "credential"
  | "api"
  | "retry"
  | "timeout"
  | "performance"
  | "recovery"
  | "readiness";

export type TestIssueSeverity = "error" | "warning" | "info";

export type TestIssueCode =
  // execution / node
  | "UNRESOLVED_REFERENCE"
  | "NODE_SIMULATION_FAILED"
  | "UNREACHABLE_NODE"
  | "MISSING_REQUIRED_PARAM"
  // trigger
  | "INVALID_TRIGGER_CONFIG"
  | "UNSUPPORTED_TRIGGER"
  // variable / mapping
  | "DANGLING_VARIABLE"
  | "TYPE_MISMATCH"
  | "MISSING_OUTPUT"
  | "BROKEN_MAPPING"
  // credential
  | "CREDENTIAL_MISSING"
  | "CREDENTIAL_EXPIRED"
  | "CREDENTIAL_INVALID"
  | "MISSING_SCOPE"
  | "PERMISSION_DENIED"
  | "CREDENTIAL_NOT_PROBED"
  // api
  | "API_UNREACHABLE"
  | "API_SLOW"
  | "API_NOT_PROBED"
  // retry / timeout / recovery
  | "NO_RETRY_ON_FLAKY"
  | "TIMEOUT_TOO_LOW"
  | "TIMEOUT_TOO_HIGH"
  | "NO_FALLBACK_PATH"
  | "CONTINUE_ON_CRITICAL"
  // performance
  | "SLOW_NODE"
  | "LONG_CHAIN"
  | "LARGE_PAYLOAD"
  // readiness
  | "VALIDATION_BLOCKED"
  | "TESTS_FAILED";

export interface TestIssue {
  code: TestIssueCode;
  severity: TestIssueSeverity;
  module: TestModule;
  /** What went wrong. */
  message: string;
  affectedNode?: string;
  /** How to fix it. Required for errors. */
  recommendation?: string;
}

export interface NodeTestResult {
  nodeId: string;
  label: string;
  status: TestStatus;
  /** Resolved inputs the node would receive in the simulated run. */
  resolvedInputs: Record<string, unknown>;
  /** Simulated output shape (synthetic values — nothing was really executed). */
  simulatedOutput: Record<string, unknown> | null;
  /** Deterministic estimate, not a measurement. */
  estimatedMs: number;
  reason?: string;
  recommendation?: string;
}

export interface ModuleResult {
  module: TestModule;
  status: TestStatus;
  passed: number;
  failed: number;
  warnings: number;
  /** Why the module was skipped, when status is SKIPPED. */
  note?: string;
}

export interface TimelineEntry {
  order: number;
  nodeId: string;
  /** Cumulative estimated start offset (ms) from trigger. */
  startMs: number;
  endMs: number;
  estimatedMs: number;
}

export type DeploymentRecommendation =
  | "DEPLOY"
  | "DEPLOY_WITH_CAUTION"
  | "DO_NOT_DEPLOY";

export interface TestReport {
  sessionId: string;
  /** Revision of the AgentWorkflowIR that was tested. */
  irRevision: number;
  /** Overall verdict across every module. */
  status: TestStatus;
  /** 0–100. 100 = everything passed. Errors dominate. */
  score: number;

  passed: number;
  failed: number;
  warnings: number;
  skipped: number;

  /** Synthetic trigger payload used to drive the simulation. */
  samplePayload: Record<string, unknown>;
  nodes: NodeTestResult[];
  modules: ModuleResult[];
  issues: TestIssue[];
  recommendations: string[];
  timeline: TimelineEntry[];
  /** Sum of estimated node times along the critical path. */
  estimatedRuntimeMs: number;

  deploymentRecommendation: DeploymentRecommendation;
  createdAt: number;
}

const ALL_MODULES: TestModule[] = [
  "execution",
  "trigger",
  "node",
  "variable",
  "mapping",
  "credential",
  "api",
  "retry",
  "timeout",
  "performance",
  "recovery",
  "readiness",
];

/**
 * Compose a TestReport.
 *
 * Score: 100 − 20/error − 5/warning, clamped to [0,100]. Skipped checks do not
 * reduce the score (nothing failed) but are surfaced so a reader knows the
 * coverage they actually got.
 *
 * Status: FAIL on any error; WARNING on any warning; SKIPPED when nothing ran
 * at all; else PASS.
 *
 * Recommendation: DO_NOT_DEPLOY on any error, DEPLOY_WITH_CAUTION on warnings,
 * else DEPLOY.
 *
 * `createdAt` is injected by the caller so reports can be made deterministic.
 */
export function buildTestReport(input: {
  sessionId: string;
  irRevision: number;
  samplePayload: Record<string, unknown>;
  nodes: NodeTestResult[];
  modules: ModuleResult[];
  issues: TestIssue[];
  timeline: TimelineEntry[];
  estimatedRuntimeMs: number;
  createdAt: number;
}): TestReport {
  const errorCount = input.issues.filter((i) => i.severity === "error").length;
  const warningCount = input.issues.filter((i) => i.severity === "warning").length;

  const passed = input.modules.filter((m) => m.status === "PASS").length;
  const failed = input.modules.filter((m) => m.status === "FAIL").length;
  const warnings = input.modules.filter((m) => m.status === "WARNING").length;
  const skipped = input.modules.filter((m) => m.status === "SKIPPED").length;

  const status: TestStatus =
    failed > 0 ? "FAIL" : warnings > 0 ? "WARNING" : passed > 0 ? "PASS" : "SKIPPED";

  const score = Math.max(0, Math.min(100, 100 - errorCount * 20 - warningCount * 5));

  const deploymentRecommendation: DeploymentRecommendation =
    errorCount > 0 ? "DO_NOT_DEPLOY" : warningCount > 0 ? "DEPLOY_WITH_CAUTION" : "DEPLOY";

  // Errors first, then warnings; deduped, order-stable.
  const recommendations: string[] = [];
  const seen = new Set<string>();
  for (const sev of ["error", "warning"] as const) {
    for (const i of input.issues) {
      if (i.severity !== sev || !i.recommendation) continue;
      if (seen.has(i.recommendation)) continue;
      seen.add(i.recommendation);
      recommendations.push(i.recommendation);
    }
  }

  // Keep module order stable regardless of execution order.
  const modules = ALL_MODULES.map(
    (m) => input.modules.find((x) => x.module === m),
  ).filter((m): m is ModuleResult => Boolean(m));

  return {
    sessionId: input.sessionId,
    irRevision: input.irRevision,
    status,
    score,
    passed,
    failed,
    warnings,
    skipped,
    samplePayload: input.samplePayload,
    nodes: input.nodes,
    modules,
    issues: input.issues,
    recommendations,
    timeline: input.timeline,
    estimatedRuntimeMs: input.estimatedRuntimeMs,
    deploymentRecommendation,
    createdAt: input.createdAt,
  };
}
