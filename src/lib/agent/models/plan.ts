/**
 * Workflow Plan models.
 *
 * The planner (Phase C) consumes intent + resolved clarification answers
 * and emits a WorkflowPlan: a LOGICAL description of the automation. It
 * contains NO visual nodes and NO engine-specific shapes. The generator
 * (Phase D) deterministically lowers a WorkflowPlan into Canonical
 * Workflow IR.
 *
 * Plan vs IR:
 *   - Plan is the planner's intermediate reasoning artifact: ordered
 *     logical steps, each naming an (integration, operation) from the
 *     catalog plus a param-source map and error policy.
 *   - IR is the validated, deployable single source of truth.
 *
 * Keeping them separate means the planner can be reasoned about + tested
 * independently of IR schema churn, while generation stays a pure,
 * deterministic lowering with no AI in the loop.
 */

import type { SupportedIntegration, StepKind, TriggerKind } from "@/lib/workflow";

/** How a planned step sources each parameter value. Mirrors IR ParamRef. */
export type PlannedParamSource =
  | { source: "literal"; value: string }
  | { source: "trigger"; ref: string }
  | { source: "step"; ref: string }
  | { source: "template"; value: string }
  | { source: "secret"; ref: string };

export type PlannedErrorPolicy = "fail" | "continue" | "retry";

export interface PlannedTrigger {
  kind: TriggerKind;
  /** Integration owning the trigger, when applicable (webhook/form/event). */
  integration: SupportedIntegration | null;
  /** Logical config — e.g. { event: "form.submitted", formId: "<resolved>" }. */
  config: Record<string, string>;
}

export interface PlannedStep {
  /** Stable logical id, snake_case. Generator reuses as IR step id. */
  id: string;
  /** Human-readable label (business-meaningful). */
  label: string;
  kind: StepKind;
  /** null = builtin transform/condition/delay. */
  integration: SupportedIntegration | null;
  /** Operation verb from the catalog. */
  operation: string;
  /** param key → source. Validated against catalog requiredParams. */
  params: Record<string, PlannedParamSource>;
  /** Logical successors (ids). Forms the DAG; generator lowers to next[]. */
  next: string[];
  errorPolicy: PlannedErrorPolicy;
  /** Retry budget when errorPolicy === "retry". */
  maxRetries?: number;
}

/* ── Planning issues ──────────────────────────────────────────────── */

export type PlanIssueSeverity = "error" | "warning" | "info";

export type PlanIssueCode =
  | "MISSING_TRIGGER"
  | "MISSING_ACTION"
  | "UNSUPPORTED_INTEGRATION"
  | "UNSUPPORTED_OPERATION"
  | "MISSING_REQUIRED_PARAM"
  | "CREDENTIAL_REQUIRED"
  | "CREDENTIAL_NOT_CONNECTED"
  | "CIRCULAR_DEPENDENCY"
  | "IMPOSSIBLE_ORDER"
  | "DUPLICATE_ACTION"
  | "CONFLICTING_ACTION"
  | "LOW_CONFIDENCE";

export interface PlanningIssue {
  code: PlanIssueCode;
  severity: PlanIssueSeverity;
  message: string;
  /** Step id / integration / param the issue concerns. */
  target?: string;
  /** How to resolve it. Required for errors. */
  recommendation?: string;
}

/* ── Auxiliary plan facets ───────────────────────────────────────── */

export interface RequiredCredential {
  integration: SupportedIntegration;
  /** Why the workflow needs it (which step/operation). */
  reason: string;
  /** Whether the session already has this connection (advisory only). */
  connected: boolean;
}

export interface DataFlowEdge {
  /** Target step id consuming the value. */
  stepId: string;
  /** Param being filled. */
  param: string;
  /** Human-readable source description (e.g. "trigger.payload.email"). */
  from: string;
}

export interface PlanRetryPolicy {
  /** Total attempts including the first. */
  maxAttempts: number;
  backoff: "none" | "fixed" | "exponential";
  baseDelayMs: number;
}

export interface PlanTimeoutStrategy {
  perStepMs: number;
  workflowMs: number;
}

export interface WorkflowPlan {
  sessionId: string;
  /** Monotonic plan version within the session (never overwrites prior). */
  version: number;

  /* ── identity ─────────────────────────────────────────────────── */
  name: string;
  summary: string;
  businessGoal: string | null;

  /* ── trigger ──────────────────────────────────────────────────── */
  trigger: PlannedTrigger;
  /** Resolved trigger source identifier (form/sheet/webhook), if known. */
  triggerSource: string | null;

  /* ── logical steps + graph ────────────────────────────────────── */
  steps: PlannedStep[];
  /** Topologically ordered ids: trigger first, then steps. */
  executionOrder: string[];
  /** DAG edges (from → to), including trigger → first steps. */
  dependencies: Array<{ from: string; to: string }>;
  /** Per-param provenance for explainability. */
  dataFlow: DataFlowEdge[];

  /* ── integrations + credentials ───────────────────────────────── */
  integrations: SupportedIntegration[];
  requiredCredentials: RequiredCredential[];

  /* ── resilience strategy ──────────────────────────────────────── */
  retryPolicy: PlanRetryPolicy;
  timeoutStrategy: PlanTimeoutStrategy;
  /** Summary of error policy decisions, per step id. */
  errorStrategy: Array<{ stepId: string; policy: PlannedErrorPolicy; reason: string }>;

  /* ── reasoning + gaps ─────────────────────────────────────────── */
  assumptions: Array<{ key: string; value: string; reason: string }>;
  unresolvedItems: string[];
  planningNotes: string[];
  issues: PlanningIssue[];

  /* ── verdict ──────────────────────────────────────────────────── */
  /** True when no error-severity issue exists. */
  ok: boolean;
  /** 0–100. 100 = fully explicit; <70 = recommend more clarification. */
  confidence: number;

  createdAt: number;
}
