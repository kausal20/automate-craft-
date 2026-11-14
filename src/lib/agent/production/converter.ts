/**
 * Validated brain plan  ->  existing compiler input (WorkflowPlan).
 *
 * The ONLY bridge between the new planner and the existing generator →
 * validator → n8n compiler chain. Pure and deterministic (clock injected).
 * It never fills a missing field: answers come from the user, and anything
 * still unanswered makes the WorkflowPlan not-ok, which the generator refuses.
 */

import type { SupportedIntegration } from "@/lib/workflow";
import { topoSort, type DagEdge } from "../planning/dag";
import type {
  DataFlowEdge,
  PlannedStep,
  PlannedTrigger,
  PlanningIssue,
  WorkflowPlan,
} from "../models/plan";
import type { BrainMissingField, BrainPlan } from "../brain/plan-schema";

const NO_AUTH = new Set(["webhook", "forms"]);
const TRIGGER_ID = "trigger";

/* ── Answers ──────────────────────────────────────────────────────── */

export interface AnswerResult {
  plan: BrainPlan;
  /** Questions still without a usable answer. */
  unanswered: BrainMissingField[];
  /** Answers to questions that are not tied to a step param (setup values). */
  setupValues: Record<string, string>;
}

function looksValid(field: BrainMissingField, value: string, plan: BrainPlan): boolean {
  const step = field.stepId ? plan.steps.find((s) => s.id === field.stepId) : undefined;
  if (field.param === "to" && step?.integration === "whatsapp") {
    return /^\+?[0-9][0-9\s-]{7,16}$/.test(value);
  }
  if ((field.param === "to" && step?.integration === "email") || field.param === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  return value.length > 0 && value.length <= 4000;
}

/** Fill each missing field ONLY from an explicit answer. Never guesses. */
export function applyAnswers(plan: BrainPlan, answers: Record<string, string>): AnswerResult {
  const copy: BrainPlan = structuredClone(plan);
  const unanswered: BrainMissingField[] = [];
  const setupValues: Record<string, string> = {};

  for (const field of copy.missingFields) {
    const raw = answers[field.key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value || !looksValid(field, value, copy)) {
      unanswered.push(field);
      continue;
    }
    if (field.stepId && field.param) {
      const step = copy.steps.find((s) => s.id === field.stepId);
      if (!step) {
        unanswered.push(field);
        continue;
      }
      step.params[field.param] = { source: "literal", value };
    } else {
      setupValues[field.key] = value;
    }
  }

  const answeredKeys = new Set(copy.missingFields.filter((f) => !unanswered.includes(f)).map((f) => f.key));
  copy.missingFields = copy.missingFields.filter((f) => !answeredKeys.has(f.key));
  return { plan: copy, unanswered, setupValues };
}

/* ── Converter ────────────────────────────────────────────────────── */

export interface ConvertOptions {
  sessionId: string;
  appsRequired: string[];
  now: number;
  version?: number;
}

export function brainPlanToWorkflowPlan(plan: BrainPlan, opts: ConvertOptions): WorkflowPlan {
  const trigger: PlannedTrigger = {
    kind: plan.trigger.kind,
    integration: (plan.trigger.integration as SupportedIntegration | null) ?? null,
    config: { ...plan.trigger.config },
  };

  const steps: PlannedStep[] = plan.steps.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    integration: (s.integration as SupportedIntegration | null) ?? null,
    operation: s.operation,
    params: structuredClone(s.params),
    next: [...s.next],
    errorPolicy: s.errorPolicy,
    ...(s.errorPolicy === "retry" ? { maxRetries: 3 } : {}),
  }));

  // Graph: trigger -> every step nobody points to, plus each step's next[].
  const pointedTo = new Set(steps.flatMap((s) => s.next));
  const roots = steps.filter((s) => !pointedTo.has(s.id)).map((s) => s.id);
  const dependencies: DagEdge[] = [
    ...roots.map((to) => ({ from: TRIGGER_ID, to })),
    ...steps.flatMap((s) => s.next.map((to) => ({ from: s.id, to }))),
  ];
  const topo = topoSort([TRIGGER_ID, ...steps.map((s) => s.id)], dependencies);

  const dataFlow: DataFlowEdge[] = [];
  for (const s of steps) {
    for (const [param, src] of Object.entries(s.params)) {
      if (src.source === "trigger") dataFlow.push({ stepId: s.id, param, from: `trigger.${src.ref}` });
      if (src.source === "step") dataFlow.push({ stepId: s.id, param, from: src.ref });
    }
  }

  const issues: PlanningIssue[] = [];
  for (const m of plan.missingFields) {
    issues.push({
      code: "MISSING_REQUIRED_PARAM",
      severity: "error",
      message: `Unanswered: ${m.key}`,
      target: m.stepId ?? m.key,
      recommendation: "Ask the user.",
    });
  }
  if (!topo.acyclic) {
    issues.push({ code: "CIRCULAR_DEPENDENCY", severity: "error", message: "Plan graph has a cycle.", recommendation: "Re-plan." });
  }

  const integrations = [...opts.appsRequired].sort() as SupportedIntegration[];

  return {
    sessionId: opts.sessionId,
    version: opts.version ?? 1,
    name: plan.name,
    summary: plan.summary,
    businessGoal: null,
    trigger,
    triggerSource: plan.trigger.config.event ?? null,
    steps,
    executionOrder: topo.order,
    dependencies,
    dataFlow,
    integrations,
    requiredCredentials: integrations
      .filter((i) => !NO_AUTH.has(i))
      .map((integration) => ({
        integration,
        reason: `Used by: ${steps.filter((s) => s.integration === integration).map((s) => s.label).join(", ") || "trigger"}`,
        connected: false,
      })),
    retryPolicy: { maxAttempts: 3, backoff: "exponential", baseDelayMs: 1000 },
    timeoutStrategy: {
      perStepMs: 30_000,
      workflowMs: Math.min(300_000, Math.max(60_000, (steps.length + 1) * 30_000)),
    },
    errorStrategy: steps.map((s) => ({ stepId: s.id, policy: s.errorPolicy, reason: "Chosen in the approved plan." })),
    assumptions: [],
    unresolvedItems: plan.missingFields.map((m) => m.key),
    planningNotes: [],
    issues,
    planningWarnings: [],
    ok: issues.every((i) => i.severity !== "error"),
    confidence: plan.missingFields.length === 0 ? 90 : 60,
    createdAt: opts.now,
  };
}
