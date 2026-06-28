/**
 * WorkflowPlanner — deterministic logical planning.
 *
 * Converts (AutomationIntent + ClarificationSession + known connections) into
 * a WorkflowPlan: trigger, ordered logical steps, dependency DAG, data flow,
 * required integrations + credentials, resilience strategy, assumptions,
 * unresolved items, planning issues, and a confidence score.
 *
 * Hard rules:
 *   - Never invents integrations or operations (operation-map is catalog-
 *     validated; any unmapped concept becomes an issue, not a guess).
 *   - Never assumes credentials exist (lists required creds + flags
 *     not-connected as advisory; the Validator in Phase E is authoritative).
 *   - Never produces Workflow IR or visual nodes — logical plan only.
 *   - Deterministic: identical inputs → identical output (ids are derived,
 *     not random; only `createdAt` is wall-clock).
 */

import type {
  StepKind,
  SupportedIntegration,
  TriggerKind,
} from "@/lib/workflow";
import type { WorkflowPlanner } from "../interfaces";
import type { AutomationIntent } from "../models/intent";
import type { ClarificationSession } from "../models/clarification";
import type { KnownConnection } from "../models/session";
import type {
  DataFlowEdge,
  PlannedErrorPolicy,
  PlannedParamSource,
  PlannedStep,
  PlannedTrigger,
  PlanningIssue,
  PlanningWarning,
  RequiredCredential,
  WorkflowPlan,
} from "../models/plan";
import { topoSort, type DagEdge } from "./dag";
import {
  ACTIONABLE_CONCEPTS,
  DATA_FLOW_PARAMS,
  USER_CONFIG_PARAMS,
  integrationsForConcept,
  requirementKeyForParam,
  resolveOperation,
  type ResolvedOperation,
} from "./operation-map";

/** Integrations that need NO credential (catalog auth kind "no_auth"). */
const NO_AUTH_INTEGRATIONS = new Set<SupportedIntegration>(["webhook", "forms"]);

/** Notification operations get a non-blocking error policy. */
const NOTIFICATION_OPS = new Set([
  "post_message",
  "post_thread",
  "send_message",
  "send_template",
  "send_email",
  "send_html_email",
]);

/** Financial operations must fail hard (never silently continue). */
const FINANCIAL_INTEGRATIONS = new Set<SupportedIntegration>(["stripe", "razorpay"]);

/** When the user names an integration but no action verb, infer its concept. */
const INTEGRATION_DEFAULT_CONCEPT: Partial<Record<SupportedIntegration, string>> = {
  slack: "notify",
  whatsapp: "notify",
  email: "notify",
  sheets: "save",
  google: "save",
  hubspot: "update_crm",
  salesforce: "update_crm",
  crm: "update_crm",
};

interface Ctx {
  intent: AutomationIntent;
  resolved: Record<string, string | string[] | null>;
  knownConnections: KnownConnection[];
  issues: PlanningIssue[];
  assumptions: WorkflowPlan["assumptions"];
  unresolved: string[];
  notes: string[];
  dataFlow: DataFlowEdge[];
}

class DeterministicWorkflowPlanner implements WorkflowPlanner {
  plan(input: {
    intent: AutomationIntent;
    clarification: ClarificationSession;
    knownConnections?: KnownConnection[];
    version?: number;
  }): WorkflowPlan {
    const ctx: Ctx = {
      intent: input.intent,
      resolved: input.clarification.resolved ?? {},
      knownConnections: input.knownConnections ?? [],
      issues: [],
      assumptions: [],
      unresolved: [],
      notes: [],
      dataFlow: [],
    };

    const trigger = this.planTrigger(ctx);
    const triggerSource = resolveString(ctx.resolved["trigger.source"]);
    const steps = this.planSteps(ctx);

    if (steps.length === 0) {
      ctx.issues.push({
        code: "MISSING_ACTION",
        severity: "error",
        message: "No supported action could be derived from the request.",
        recommendation: "Describe what the workflow should DO (notify, save, update CRM, …).",
      });
    }

    // Link into a linear DAG: trigger → s1 → s2 → … (deterministic order).
    const nodeIds = ["trigger", ...steps.map((s) => s.id)];
    const edges: DagEdge[] = [];
    for (let i = 0; i < nodeIds.length - 1; i++) {
      edges.push({ from: nodeIds[i], to: nodeIds[i + 1] });
    }
    // reflect edges onto step.next
    for (let i = 0; i < steps.length; i++) {
      steps[i].next = i < steps.length - 1 ? [steps[i + 1].id] : [];
    }

    const topo = topoSort(nodeIds, edges);
    if (!topo.acyclic) {
      ctx.issues.push({
        code: "CIRCULAR_DEPENDENCY",
        severity: "error",
        message: `Execution graph contains a cycle: ${topo.cycleNodes.join(" → ")}.`,
        recommendation: "Remove the circular dependency between steps.",
      });
    }

    // Duplicate action detection.
    this.detectDuplicates(steps, ctx);

    // Integrations + credentials.
    const integrations = dedupe<SupportedIntegration>([
      ...(trigger.integration ? [trigger.integration] : []),
      ...steps.flatMap((s) => (s.integration ? [s.integration] : [])),
    ]);
    const requiredCredentials = this.planCredentials(integrations, steps, ctx);

    // Resilience.
    const errorStrategy = steps.map((s) => ({
      stepId: s.id,
      policy: s.errorPolicy,
      reason: errorPolicyReason(s),
    }));
    const retryPolicy = {
      maxAttempts: 3,
      backoff: "exponential" as const,
      baseDelayMs: 1000,
    };
    const timeoutStrategy = {
      perStepMs: 30_000,
      workflowMs: Math.min(300_000, Math.max(60_000, nodeIds.length * 30_000)),
    };

    const ok = ctx.issues.every((i) => i.severity !== "error");
    const confidence = this.scoreConfidence(ctx, ok);

    if (ok && confidence < 70) {
      ctx.issues.push({
        code: "LOW_CONFIDENCE",
        severity: "info",
        message: `Plan confidence is ${confidence}/100 due to assumptions/unresolved items.`,
        recommendation: "Ask the user to confirm the assumptions before generating the workflow.",
      });
    }

    const name = deriveName(ctx.intent, steps);
    const summary = deriveSummary(trigger, steps);

    const planningWarnings = this.buildWarnings({
      ctx,
      trigger,
      steps,
      requiredCredentials,
      executionOrder: topo.order,
      confidence,
    });

    return {
      sessionId: input.intent.sessionId,
      version: input.version ?? 1,
      name,
      summary,
      businessGoal: ctx.intent.businessGoal,
      trigger,
      triggerSource,
      steps,
      executionOrder: topo.order,
      dependencies: edges,
      dataFlow: ctx.dataFlow,
      integrations,
      requiredCredentials,
      retryPolicy,
      timeoutStrategy,
      errorStrategy,
      assumptions: ctx.assumptions,
      unresolvedItems: ctx.unresolved,
      planningNotes: ctx.notes,
      issues: ctx.issues,
      planningWarnings,
      ok,
      confidence,
      createdAt: Date.now(),
    };
  }

  /* ── warnings (informational, never blocking) ───────────────────── */

  /**
   * Derive advisory warnings from the final planner state. Deterministic:
   * fixed emission order, dedup by (code + relatedStepId + relatedIntegration),
   * no wall-clock / random. Every warning maps to a concrete piece of state —
   * the planner never invents a risk.
   */
  private buildWarnings(p: {
    ctx: Ctx;
    trigger: PlannedTrigger;
    steps: PlannedStep[];
    requiredCredentials: RequiredCredential[];
    executionOrder: string[];
    confidence: number;
  }): PlanningWarning[] {
    const { ctx, trigger, steps, requiredCredentials, executionOrder, confidence } = p;
    const warnings: PlanningWarning[] = [];

    // 1. Config-level assumed defaults (NOT routine trigger-payload mappings).
    const configAssumptions = ctx.assumptions.filter(
      (a) => !a.value.startsWith("trigger.payload"),
    );
    for (const a of configAssumptions) {
      warnings.push({
        code: "ASSUMED_DEFAULT",
        severity: "MEDIUM",
        title: `Assumed default: ${a.key}`,
        description: `${a.reason} Value: "${a.value}".`,
        recommendation: `Confirm "${a.key}" is correct, or provide an explicit value.`,
      });
    }

    // 2. Missing connected accounts + 5. credential required.
    for (const cred of requiredCredentials) {
      if (!cred.connected) {
        warnings.push({
          code: "UNVERIFIED_CONNECTION",
          severity: "MEDIUM",
          title: `${cap(cred.integration)} connection not verified`,
          description: `${cap(cred.integration)} is required but no confirmed connection was found.`,
          recommendation: `Connect ${cred.integration} before deployment.`,
          relatedIntegration: cred.integration,
        });
      } else {
        warnings.push({
          code: "CREDENTIAL_REQUIRED",
          severity: "INFO",
          title: `${cap(cred.integration)} credentials required at deploy`,
          description: `${cap(cred.integration)} credentials will be used when the workflow runs.`,
          recommendation: `Ensure the ${cred.integration} connection stays valid.`,
          relatedIntegration: cred.integration,
        });
      }
    }

    // 3. Unsupported conditional branching (planner is linear-only).
    if (steps.length > 0 && mentionsBranching(ctx.intent.sourceText)) {
      warnings.push({
        code: "UNSUPPORTED_CONDITIONAL",
        severity: "HIGH",
        title: "Conditional branching not supported",
        description:
          "The request implies conditional logic, but the planner produced a linear sequence.",
        recommendation: "Review the flow; branching must be handled manually for now.",
      });
    }

    // 4. Confidence below 90.
    if (confidence < 90) {
      const severity = confidence < 70 ? "HIGH" : "MEDIUM";
      warnings.push({
        code: "LOW_CONFIDENCE",
        severity,
        title: `Plan confidence ${confidence}%`,
        description: confidenceReason(ctx),
        recommendation:
          "Confirm the assumptions and unresolved items before generating the workflow.",
      });
    }

    // 6. External webhook dependency.
    const dependsOnWebhook =
      trigger.kind === "webhook" || trigger.integration === "webhook";
    if (dependsOnWebhook) {
      warnings.push({
        code: "EXTERNAL_DEPENDENCY",
        severity: "MEDIUM",
        title: "Depends on an external webhook",
        description: "This workflow is triggered by an inbound webhook from an external system.",
        recommendation: "Ensure the external source is configured to call the webhook reliably.",
      });
    }

    // 7. Retry recommendations — one per distinct integration with a retry step.
    const retrySeen = new Set<string>();
    for (const s of steps) {
      if (s.errorPolicy !== "retry" || !s.integration) continue;
      if (retrySeen.has(s.integration)) continue;
      retrySeen.add(s.integration);
      warnings.push({
        code: "RETRY_RECOMMENDED",
        severity: "LOW",
        title: `${cap(s.integration)} uses retry logic`,
        description: `${cap(s.integration)} writes can fail on transient network errors; retries are planned.`,
        recommendation: "No action needed; retries will handle transient failures.",
        relatedStepId: s.id,
        relatedIntegration: s.integration,
      });
    }

    // 8. Long execution chain (latency risk).
    if (executionOrder.length > 5) {
      warnings.push({
        code: "LONG_CHAIN",
        severity: "MEDIUM",
        title: `Long sequential chain (${executionOrder.length} nodes)`,
        description:
          "Many sequential steps increase end-to-end execution latency and failure surface.",
        recommendation: "Consider whether any steps can be removed, merged, or parallelized.",
      });
    }

    // 9. Manual review — significant assumptions or notable risk present.
    const hasHighOrMedium = warnings.some(
      (w) => w.severity === "HIGH" || w.severity === "MEDIUM",
    );
    if (configAssumptions.length >= 2 || confidence < 80 || hasHighOrMedium) {
      warnings.push({
        code: "MANUAL_REVIEW",
        severity: "LOW",
        title: "Manual review recommended",
        description:
          "The plan relies on assumptions or carries advisory risks worth a human check.",
        recommendation: "Review the workflow before deployment.",
      });
    }

    return dedupeWarnings(warnings);
  }

  /* ── trigger ────────────────────────────────────────────────────── */

  private planTrigger(ctx: Ctx): PlannedTrigger {
    const concept = ctx.intent.triggerConcept;
    const source = resolveString(ctx.resolved["trigger.source"]);
    const schedule = resolveString(ctx.resolved["trigger.schedule"]);

    let kind: TriggerKind = "manual";
    let integration: SupportedIntegration | null = null;
    const config: Record<string, string> = {};

    switch (concept) {
      case "form_submission":
        kind = "form";
        integration = "forms";
        config.formIdField = source ?? "";
        if (!source) this.missingTriggerSource(ctx, "form");
        break;
      case "sheet_change":
        kind = "event";
        integration = "sheets";
        config.event = "row.added";
        config.source = source ?? "";
        if (!source) this.missingTriggerSource(ctx, "sheet");
        break;
      case "webhook":
        kind = "webhook";
        integration = "webhook";
        config.event = source ?? "inbound";
        break;
      case "schedule":
        kind = "schedule";
        config.cron = scheduleToCron(schedule);
        config.timezone = "UTC";
        if (!schedule) {
          ctx.assumptions.push({
            key: "trigger.schedule",
            value: "every day at 09:00 UTC",
            reason: "No schedule given; applied a safe daily default.",
          });
        }
        ctx.notes.push(`Trigger: scheduled (${config.cron} ${config.timezone}).`);
        break;
      case "payment": {
        kind = "event";
        integration =
          (ctx.intent.integrations.find((i) => FINANCIAL_INTEGRATIONS.has(i)) ??
            "stripe") as SupportedIntegration;
        config.event = "payment.succeeded";
        ctx.notes.push(`Trigger: ${integration} payment event.`);
        break;
      }
      default:
        // No trigger concept.
        if (ctx.intent.integrations.length === 0) {
          ctx.issues.push({
            code: "MISSING_TRIGGER",
            severity: "error",
            message: "No trigger could be identified from the request.",
            recommendation: "Specify what event should start the workflow.",
          });
        } else {
          kind = "manual";
          ctx.assumptions.push({
            key: "trigger.kind",
            value: "manual",
            reason: "No trigger event detected; defaulted to manual run.",
          });
          ctx.notes.push("Trigger: defaulted to manual (no event detected).");
        }
    }

    if (concept && kind !== "manual") {
      ctx.notes.push(`Trigger: ${kind}${integration ? ` (${integration})` : ""}.`);
    }
    return { kind, integration, config };
  }

  private missingTriggerSource(ctx: Ctx, what: string) {
    ctx.unresolved.push(`trigger.source (${what})`);
    ctx.issues.push({
      code: "MISSING_REQUIRED_PARAM",
      severity: "warning",
      message: `The ${what} that triggers this workflow is not identified.`,
      target: "trigger.source",
      recommendation: `Ask which ${what} should trigger the workflow.`,
    });
  }

  /* ── steps ──────────────────────────────────────────────────────── */

  private planSteps(ctx: Ctx): PlannedStep[] {
    const steps: PlannedStep[] = [];
    const seen = new Set<string>();

    // Concepts to action: explicit action concepts, else inferred from
    // named integrations.
    let concepts = [...ctx.intent.actionConcepts];
    if (concepts.length === 0 && ctx.intent.integrations.length > 0) {
      const inferred = dedupe(
        ctx.intent.integrations
          .map((i) => INTEGRATION_DEFAULT_CONCEPT[i])
          .filter((c): c is string => Boolean(c)),
      );
      if (inferred.length > 0) {
        concepts = inferred;
        ctx.assumptions.push({
          key: "actions",
          value: inferred.join(", "),
          reason: "No action verb given; inferred from the named integrations.",
        });
      }
    }

    let index = 0;
    for (const concept of concepts) {
      if (!ACTIONABLE_CONCEPTS.has(concept)) {
        // Concept exists in intent but has no catalog operation (e.g.
        // create_task, score). Surface, do not guess.
        ctx.issues.push({
          code: "UNSUPPORTED_OPERATION",
          severity: "warning",
          message: `No supported operation exists for "${concept}".`,
          target: concept,
          recommendation: `"${concept}" is not yet supported; remove it or pick a supported action.`,
        });
        ctx.unresolved.push(`action:${concept}`);
        continue;
      }

      const candidates = integrationsForConcept(concept).filter((i) =>
        ctx.intent.integrations.includes(i),
      );
      if (candidates.length === 0) {
        ctx.issues.push({
          code: "UNSUPPORTED_OPERATION",
          severity: "warning",
          message: `"${concept}" was requested but no matching integration was named.`,
          target: concept,
          recommendation: `Name an integration that can ${concept} (e.g. ${integrationsForConcept(concept).join(", ")}).`,
        });
        ctx.unresolved.push(`action:${concept}`);
        continue;
      }

      for (const integration of candidates) {
        const op = resolveOperation(concept, integration);
        if (!op) continue;
        const dedupeKey = `${integration}.${op.operation}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        index += 1;
        steps.push(this.buildStep(ctx, op, index));
      }
    }

    return steps;
  }

  private buildStep(ctx: Ctx, op: ResolvedOperation, index: number): PlannedStep {
    const id = `s${index}_${op.integration}_${op.operation}`;
    const params: Record<string, PlannedParamSource> = {};

    for (const param of op.requiredParams) {
      if (USER_CONFIG_PARAMS.has(param)) {
        const key = requirementKeyForParam(op.integration, param);
        const val = resolveString(ctx.resolved[key]);
        if (val != null) {
          params[param] = { source: "literal", value: val };
          ctx.dataFlow.push({ stepId: id, param, from: `clarification:${key}` });
        } else {
          ctx.unresolved.push(`${id}.${param}`);
          ctx.issues.push({
            code: "MISSING_REQUIRED_PARAM",
            severity: "warning",
            message: `Step "${id}" needs "${param}" but it was not provided.`,
            target: `${id}.${param}`,
            recommendation: `Ask the user for ${param} of ${op.integration}.`,
          });
        }
      } else if (DATA_FLOW_PARAMS.has(param)) {
        params[param] = { source: "trigger", ref: `payload.${param}` };
        ctx.dataFlow.push({ stepId: id, param, from: `trigger.payload.${param}` });
        ctx.assumptions.push({
          key: `${id}.${param}`,
          value: `trigger.payload.${param}`,
          reason: `"${param}" assumed to come from the trigger payload.`,
        });
      } else {
        // Required but neither user-config nor a known data-flow field.
        params[param] = { source: "literal", value: "" };
        ctx.unresolved.push(`${id}.${param}`);
        ctx.issues.push({
          code: "MISSING_REQUIRED_PARAM",
          severity: "warning",
          message: `Step "${id}" requires "${param}" which could not be sourced.`,
          target: `${id}.${param}`,
          recommendation: `Provide a value or mapping for ${param}.`,
        });
      }
    }

    const kind: StepKind = op.kind;
    const errorPolicy = decideErrorPolicy(op);
    ctx.notes.push(`Action: ${op.integration}.${op.operation} (${kind}, onError=${errorPolicy}).`);

    return {
      id,
      label: labelFor(op),
      kind,
      integration: op.integration,
      operation: op.operation,
      params,
      next: [],
      errorPolicy,
      ...(errorPolicy === "retry" ? { maxRetries: 2 } : {}),
    };
  }

  /* ── credentials ────────────────────────────────────────────────── */

  private planCredentials(
    integrations: SupportedIntegration[],
    steps: PlannedStep[],
    ctx: Ctx,
  ): RequiredCredential[] {
    const out: RequiredCredential[] = [];
    for (const integration of integrations) {
      if (NO_AUTH_INTEGRATIONS.has(integration)) continue;
      const connected = ctx.knownConnections.some(
        (c) => c.integration === integration && c.status === "connected",
      );
      const usedBy = steps.find((s) => s.integration === integration)?.id ?? "trigger";
      out.push({
        integration,
        reason: `Required by ${usedBy}.`,
        connected,
      });
      if (!connected) {
        ctx.issues.push({
          code: "CREDENTIAL_NOT_CONNECTED",
          severity: "warning",
          message: `${integration} is required but not connected.`,
          target: integration,
          recommendation: `Connect ${integration} before deployment.`,
        });
      }
    }
    return out;
  }

  /* ── duplicates ─────────────────────────────────────────────────── */

  private detectDuplicates(steps: PlannedStep[], ctx: Ctx) {
    const sig = new Map<string, string>();
    for (const s of steps) {
      const key = `${s.integration}.${s.operation}:${JSON.stringify(s.params)}`;
      if (sig.has(key)) {
        ctx.issues.push({
          code: "DUPLICATE_ACTION",
          severity: "warning",
          message: `Step "${s.id}" duplicates "${sig.get(key)}".`,
          target: s.id,
          recommendation: "Remove the redundant action.",
        });
      } else {
        sig.set(key, s.id);
      }
    }
  }

  /* ── confidence ─────────────────────────────────────────────────── */

  private scoreConfidence(ctx: Ctx, ok: boolean): number {
    if (!ok) {
      // Errors dominate: cap low regardless of other factors.
      return Math.max(0, 45 - ctx.issues.filter((i) => i.severity === "error").length * 5);
    }
    let score = 100;
    score -= ctx.unresolved.length * 15;
    score -= ctx.assumptions.length * 4;
    score -= ctx.issues.filter((i) => i.severity === "warning").length * 8;
    return Math.max(0, Math.min(100, Math.floor(score)));
  }
}

/* ── helpers ──────────────────────────────────────────────────────── */

/** Detect conditional-branching intent in the original request text. */
function mentionsBranching(text: string): boolean {
  const n = (text ?? "").toLowerCase();
  return /\b(if|else|otherwise|depending on|conditional|branch|when .+ then|in case)\b/.test(n);
}

/** Human reason for a sub-90 confidence score, from concrete counts. */
function confidenceReason(ctx: Ctx): string {
  const parts: string[] = [];
  if (ctx.unresolved.length > 0) parts.push(`${ctx.unresolved.length} unresolved item(s)`);
  const warn = ctx.issues.filter((i) => i.severity === "warning").length;
  if (warn > 0) parts.push(`${warn} warning issue(s)`);
  const configAssumptions = ctx.assumptions.filter((a) => !a.value.startsWith("trigger.payload"));
  if (configAssumptions.length > 0) parts.push(`${configAssumptions.length} assumed default(s)`);
  return parts.length > 0
    ? `Confidence reduced by ${parts.join(", ")}.`
    : "Confidence reduced by minor inferences.";
}

/** Dedup warnings by (code + relatedStepId + relatedIntegration). */
function dedupeWarnings(warnings: PlanningWarning[]): PlanningWarning[] {
  const seen = new Set<string>();
  const out: PlanningWarning[] = [];
  for (const w of warnings) {
    const key = `${w.code}|${w.relatedStepId ?? ""}|${w.relatedIntegration ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function decideErrorPolicy(op: ResolvedOperation): PlannedErrorPolicy {
  if (NOTIFICATION_OPS.has(op.operation)) return "continue";
  if (FINANCIAL_INTEGRATIONS.has(op.integration)) return "fail";
  if (op.kind === "save" || op.kind === "action") return "retry";
  return "fail";
}

function errorPolicyReason(s: PlannedStep): string {
  if (s.errorPolicy === "continue") return "Non-critical notification — continue on error.";
  if (s.errorPolicy === "retry") return "External write — retry transient failures.";
  return "Critical step — fail fast on error.";
}

function labelFor(op: ResolvedOperation): string {
  const verb = op.operation.replace(/_/g, " ");
  return `${cap(op.integration)}: ${verb}`;
}

function deriveName(intent: AutomationIntent, steps: PlannedStep[]): string {
  const action = steps[0]?.integration;
  if (action === "whatsapp") return "WhatsApp Automation";
  if (action === "slack") return "Slack Automation";
  if (action === "email") return "Email Automation";
  if (intent.triggerConcept === "form_submission") return "Form Automation";
  if (intent.triggerConcept === "payment") return "Payment Automation";
  return "Automation Workflow";
}

function deriveSummary(trigger: PlannedTrigger, steps: PlannedStep[]): string {
  const head = `${trigger.kind}${trigger.integration ? `:${trigger.integration}` : ""}`;
  const tail = steps.map((s) => `${s.integration}.${s.operation}`).join(" → ");
  return tail ? `${head} → ${tail}` : head;
}

function scheduleToCron(schedule: string | null): string {
  if (!schedule) return "0 9 * * *";
  const n = schedule.toLowerCase();
  if (/hour/.test(n)) return "0 * * * *";
  if (/week/.test(n)) return "0 9 * * 1";
  if (/month/.test(n)) return "0 9 1 * *";
  return "0 9 * * *"; // daily default
}

function resolveString(v: string | string[] | null | undefined): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v.join(", ");
  return v;
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const workflowPlanner: WorkflowPlanner = new DeterministicWorkflowPlanner();
