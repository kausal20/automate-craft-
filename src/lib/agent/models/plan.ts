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

export interface WorkflowPlan {
  sessionId: string;
  /** Business-readable workflow name derived from intent. */
  name: string;
  summary: string;
  trigger: PlannedTrigger;
  steps: PlannedStep[];
  /** All integrations referenced (trigger + steps), deduped. */
  integrations: SupportedIntegration[];
  /**
   * Requirements the planner could NOT fill from clarification and
   * resolved via documented defaults. Surfaced to the user for trust.
   */
  assumedDefaults: Array<{ requirementKey: string; value: string; reason: string }>;
  createdAt: number;
}
