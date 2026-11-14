/**
 * Production agent service.
 *
 *   preview  : prompt -> planner (catalogue-gated) -> draft (needs_input | needs_connection | ready | rejected)
 *   confirm  : explicit OK + answers -> connect-once gate -> reserve credits -> compile -> n8n (INACTIVE)
 *              -> preflight -> test run -> only on full pass: activate. Any failure: stays off, refund.
 *   runtime  : list / get / pause / resume / status (synced from n8n) / activity, all owner-scoped.
 *
 * The owner never sees n8n, node names, codes or stacks: every message comes
 * from errors.ts. Technical detail goes to logTechnical (redacted).
 */

import type { N8nWorkflow } from "@/lib/adapters/n8n/client/types";
import type { CredentialAttachmentMap } from "@/lib/adapters/n8n/credentials/mapper";
import { calculateExecutionCost, calculateGenerationCost, type WorkflowIR } from "@/lib/workflow";
import type { AppCatalogue } from "../brain/catalogue";
import { appLabel } from "../brain/catalogue";
import type { BrainPlan } from "../brain/plan-schema";
import type { Planner } from "../brain/planner";
import type { WorkflowPlan } from "../models/plan";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { KnownConnection } from "../models/session";
import type { ValidationReport } from "../models/validation";
import { applyAnswers, brainPlanToWorkflowPlan } from "./converter";
import { AgentUserError, logTechnical, normalizeLang, userMessage } from "./errors";
import { checkConnections } from "./gate";
import type {
  ActivityKind,
  ActivityLog,
  AgentAutomation,
  AutomationRepo,
  AutomationView,
  ConfirmResponse,
  ConnectionDirectory,
  ConnectionSelection,
  CredentialBinder,
  CreditLedger,
  Draft,
  DraftRepo,
  N8nGateway,
  PreviewResponse,
  TestRunResult,
} from "./types";

/* ── Dependencies ─────────────────────────────────────────────────── */

export interface BuildPipeline {
  /** Existing deterministic generator: WorkflowPlan -> canonical IR. */
  generate(plan: WorkflowPlan): AgentWorkflowIR;
  /** Existing validator (preflight). */
  validate(input: { sessionId: string; ir: AgentWorkflowIR; knownConnections: KnownConnection[] }): ValidationReport;
  /** Existing IR -> n8n compiler. */
  compile(ir: AgentWorkflowIR, attachments: CredentialAttachmentMap): N8nWorkflow;
}

export interface AgentDeps {
  planner: Planner;
  catalogue: () => AppCatalogue;
  drafts: DraftRepo;
  automations: AutomationRepo;
  activity: ActivityLog;
  credits: CreditLedger;
  directory: ConnectionDirectory;
  binder: CredentialBinder;
  n8n: N8nGateway;
  pipeline: BuildPipeline;
  newId: () => string;
  now?: () => number;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

const PREVIEW_HEADER: Record<"en" | "hi" | "hinglish", string> = {
  en: "I will make this:",
  hinglish: "Main yeh banaunga:",
  hi: "मैं यह बनाऊँगा:",
};

const START_LINE: Record<"en" | "hi" | "hinglish", (app: string | null) => string> = {
  en: (app) => (app ? `Start when something new arrives from ${app}` : "Start when you run it or on schedule"),
  hinglish: (app) => (app ? `Jab ${app} se kuch naya aaye, tab shuru` : "Aap chalayein ya schedule par shuru"),
  hi: (app) => (app ? `जब ${app} से कुछ नया आए, तब शुरू` : "आप चलाएँ या तय समय पर शुरू"),
};

/** Credits for building + the single test run. Shown before confirm; reserved on confirm. */
export function estimateBuildCost(plan: BrainPlan): number {
  const runCost = calculateExecutionCost({
    steps: plan.steps.map((s) => ({ id: s.id, integration: s.integration ?? undefined })),
  } as unknown as WorkflowIR).total;
  return calculateGenerationCost("standard") + runCost;
}

function previewLines(plan: BrainPlan, language: string): { text: string; steps: string[] } {
  const lang = normalizeLang(language);
  const steps = [
    START_LINE[lang](plan.trigger.integration ? appLabel(plan.trigger.integration) : null),
    ...plan.steps.map((s) => s.label),
  ];
  const text = [PREVIEW_HEADER[lang], ...steps.map((s, i) => `${i + 1}. ${s}`)].join("\n");
  return { text, steps };
}

/** Sample trigger payload for the test run: built from the fields the plan actually reads. */
export function samplePayload(plan: BrainPlan): Record<string, unknown> {
  const root: Record<string, unknown> = { automatecraft_test_run: true };
  const sampleFor = (leaf: string): string => {
    const l = leaf.toLowerCase();
    if (/phone|mobile|whatsapp|number/.test(l)) return "+910000000000";
    if (/email|mail/.test(l)) return "test@example.com";
    if (/name/.test(l)) return "Test Customer";
    if (/amount|price|total/.test(l)) return "100";
    return "sample";
  };
  for (const step of plan.steps) {
    for (const src of Object.values(step.params)) {
      if (src.source !== "trigger") continue;
      const parts = src.ref.replace(/\[\d+\]/g, "").split(".").filter(Boolean);
      let node = root;
      parts.forEach((p, i) => {
        if (i === parts.length - 1) {
          if (node[p] === undefined) node[p] = sampleFor(p);
        } else {
          if (typeof node[p] !== "object" || node[p] === null) node[p] = {};
          node = node[p] as Record<string, unknown>;
        }
      });
    }
  }
  return root;
}

function toView(a: AgentAutomation): AutomationView {
  return {
    id: a.id,
    name: a.name,
    status: a.status,
    apps: a.appsRequired.map(appLabel),
    message: a.lastMessage,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function cornerName(userId: string, automationId: string, name: string): string {
  return `ac:${userId}:${automationId} | ${name}`.slice(0, 128);
}

/* ── Service ──────────────────────────────────────────────────────── */

export class AgentService {
  private readonly d: AgentDeps;
  constructor(deps: AgentDeps) {
    this.d = deps;
  }

  private now(): number {
    return this.d.now ? this.d.now() : Date.now();
  }
  private iso(): string {
    return new Date(this.now()).toISOString();
  }
  private async log(userId: string, automationId: string, kind: ActivityKind, message: string) {
    await this.d.activity.append({ userId, automationId, kind, message });
  }

  /* ── Step 1: preview ────────────────────────────────────────────── */

  async preview(input: { userId: string; prompt: string }): Promise<PreviewResponse> {
    const prompt = input.prompt.trim();
    if (prompt.length < 3 || prompt.length > 4000) throw new AgentUserError("bad_request", 400, "prompt length");

    const catalogue = this.d.catalogue();
    const result = await this.d.planner.plan({ prompt, catalogue });
    const id = this.d.newId();
    const at = this.iso();

    if (result.status === "rejected") {
      const draft: Draft = {
        id, userId: input.userId, status: "rejected", language: "en", prompt, plan: null, appsRequired: [],
        questions: [], answers: {}, selections: [], costEstimate: 0, rejectionReason: result.reason,
        unsupportedRequests: result.problems.filter((p) => p.code === "UNSUPPORTED_REQUEST").map((p) => p.target),
        automationId: null, buildAttempt: 0, createdAt: at, updatedAt: at,
      };
      await this.d.drafts.create(draft);
      return {
        draftId: id, status: "rejected", language: "en", preview: "", steps: [], costEstimate: 0, questions: [],
        connections: [], unsupportedRequests: draft.unsupportedRequests, reason: result.reason,
      };
    }

    const plan = result.plan;
    const questions = plan.missingFields.map((m) => ({ key: m.key, question: m.question, stepId: m.stepId, param: m.param }));
    const accounts = await this.d.directory.listAccounts(input.userId);
    const gate = checkConnections(result.appsRequired, accounts, []);
    const status = questions.length > 0 ? "needs_input" : gate.ok ? "ready" : "needs_connection";
    const cost = estimateBuildCost(plan);
    const { text, steps } = previewLines(plan, plan.language);

    await this.d.drafts.create({
      id, userId: input.userId, status, language: plan.language, prompt, plan, appsRequired: result.appsRequired,
      questions, answers: {}, selections: gate.chosen, costEstimate: cost, rejectionReason: null,
      unsupportedRequests: [], automationId: null, buildAttempt: 0, createdAt: at, updatedAt: at,
    });

    return {
      draftId: id, status, language: plan.language, preview: text, steps, costEstimate: cost,
      questions: questions.map(({ key, question }) => ({ key, question })),
      connections: gate.ok ? [] : gate.needs, unsupportedRequests: [], reason: null,
    };
  }

  async getDraft(userId: string, draftId: string): Promise<Draft> {
    const d = await this.d.drafts.get(userId, draftId);
    if (!d) throw new AgentUserError("not_found", 404, "draft");
    return d;
  }

  /* ── Step 2: confirm -> build -> test -> on ─────────────────────── */

  async confirm(input: {
    userId: string;
    draftId: string;
    confirm: boolean;
    answers?: Record<string, string>;
    selections?: ConnectionSelection[];
  }): Promise<ConfirmResponse> {
    const draft = await this.getDraft(input.userId, input.draftId);
    const lang = draft.language;

    // Idempotency: an already-finished or running build is reported, never redone.
    if (draft.status === "built" && draft.automationId) {
      return { status: "active", draftId: draft.id, automationId: draft.automationId, message: userMessage("active", lang) };
    }
    if (draft.status === "building") {
      return { status: "building", draftId: draft.id, automationId: draft.automationId, message: userMessage("build_in_progress", lang) };
    }
    if (draft.status === "rejected" || !draft.plan) {
      return { status: "blocked", draftId: draft.id, automationId: null, message: draft.rejectionReason ?? userMessage("generic", lang) };
    }

    const answers = { ...draft.answers, ...(input.answers ?? {}) };
    const selections = mergeSelections(draft.selections, input.selections ?? []);

    // Never guess: every question needs an explicit, valid answer.
    const filled = applyAnswers(draft.plan, answers);
    if (filled.unanswered.length > 0) {
      const questions = filled.unanswered.map((m) => ({ key: m.key, question: m.question, stepId: m.stepId, param: m.param }));
      await this.d.drafts.update(input.userId, draft.id, { status: "needs_input", answers, questions });
      return {
        status: "needs_input", draftId: draft.id, message: userMessage("needs_input", lang),
        questions: questions.map(({ key, question }) => ({ key, question })),
      };
    }

    // Connect once: every app must have a usable saved account; two accounts -> user picks.
    const accounts = await this.d.directory.listAccounts(input.userId);
    const gate = checkConnections(draft.appsRequired, accounts, selections);
    if (!gate.ok) {
      await this.d.drafts.update(input.userId, draft.id, { status: "needs_connection", answers, questions: [], selections: gate.chosen });
      return { status: "needs_connection", draftId: draft.id, connections: gate.needs, message: userMessage("needs_connection", lang) };
    }

    if (!input.confirm) {
      await this.d.drafts.update(input.userId, draft.id, { status: "ready", answers, questions: [], selections: gate.chosen });
      return { status: "not_confirmed", draftId: draft.id, message: userMessage("not_confirmed", lang) };
    }

    if (!this.d.n8n.isConfigured()) {
      logTechnical("Build blocked: n8n not configured.", { draftId: draft.id });
      await this.d.drafts.update(input.userId, draft.id, { status: "ready", answers, selections: gate.chosen });
      return { status: "blocked", draftId: draft.id, automationId: draft.automationId, message: userMessage("engine_unavailable", lang) };
    }

    const balance = await this.d.credits.balance(input.userId);
    if (balance < draft.costEstimate) {
      await this.d.drafts.update(input.userId, draft.id, { status: "ready", answers, selections: gate.chosen });
      return {
        status: "insufficient_credits", draftId: draft.id, message: userMessage("insufficient_credits", lang),
        needed: draft.costEstimate, balance,
      };
    }

    // Claim the build atomically. A second concurrent confirm gets null and is told it is in progress.
    const automationId = draft.automationId ?? this.d.newId();
    const claimed = await this.d.drafts.transition(
      input.userId, draft.id, ["ready", "needs_input", "needs_connection", "failed_test"],
      { status: "building", automationId, buildAttempt: draft.buildAttempt + 1, answers, selections: gate.chosen, questions: [] },
    );
    if (!claimed) {
      const current = await this.getDraft(input.userId, draft.id);
      if (current.status === "built" && current.automationId) {
        return { status: "active", draftId: draft.id, automationId: current.automationId, message: userMessage("active", lang) };
      }
      return { status: "building", draftId: draft.id, automationId: current.automationId, message: userMessage("build_in_progress", lang) };
    }

    return this.build(claimed, filled.plan, gate.chosen);
  }

  private async build(draft: Draft, plan: BrainPlan, chosen: ConnectionSelection[]): Promise<ConfirmResponse> {
    const { userId } = draft;
    const automationId = draft.automationId!;
    const lang = draft.language;
    const referenceId = `agent-build:${automationId}:${draft.buildAttempt}`;
    const amount = draft.costEstimate;

    // 1. Reserve credits up front.
    const reserved = await this.d.credits.reserve({
      userId, amount, referenceId, description: `Build automation ${automationId} (attempt ${draft.buildAttempt})`,
    });
    if (!reserved.ok) {
      await this.d.drafts.update(userId, draft.id, { status: "ready" });
      const balance = await this.d.credits.balance(userId);
      return { status: "insufficient_credits", draftId: draft.id, message: userMessage("insufficient_credits", lang), needed: amount, balance };
    }

    // 2. The automation record (one per draft; reused on retry).
    const existing = await this.d.automations.get(userId, automationId);
    const at = this.iso();
    if (!existing) {
      await this.d.automations.create({
        id: automationId, userId, draftId: draft.id, name: plan.name, language: lang, status: "building",
        appsRequired: draft.appsRequired, selections: chosen, n8nWorkflowId: null, testExecutionId: null,
        lastMessage: userMessage("build_in_progress", lang), createdAt: at, updatedAt: at,
      });
    } else {
      await this.d.automations.update(userId, automationId, { status: "building", selections: chosen, lastMessage: userMessage("build_in_progress", lang) });
    }

    const fail = async (key: "build_failed" | "test_failed" | "test_failed_app" | "connection_failed", vars: Record<string, string>, workflowId: string | null, technical: string, kind: ActivityKind) => {
      if (workflowId) {
        try {
          await this.d.n8n.deactivate(workflowId);
        } catch (e) {
          logTechnical("Could not confirm workflow is inactive after failure.", { automationId, workflowId }, e);
        }
      }
      const refunded = await this.d.credits.refund({ userId, amount, referenceId, description: `Refund: build ${automationId} did not pass` });
      if (!refunded) logTechnical("Refund failed — needs manual attention.", { automationId, referenceId });
      const message = userMessage(key, lang, vars);
      logTechnical("Build did not pass.", { automationId, referenceId, technical });
      await this.d.automations.update(userId, automationId, { status: "failed_test", lastMessage: message, ...(workflowId ? { n8nWorkflowId: workflowId } : {}) });
      await this.d.drafts.update(userId, draft.id, { status: "failed_test" });
      await this.log(userId, automationId, kind, message);
      return { status: "failed_test" as const, draftId: draft.id, automationId, message };
    };

    let workflowId: string | null = existing?.n8nWorkflowId ?? null;
    try {
      // 3. Plan -> WorkflowPlan -> IR (existing generator) -> preflight (existing validator).
      const wp = brainPlanToWorkflowPlan(plan, { sessionId: draft.id, appsRequired: draft.appsRequired, now: this.now(), version: draft.buildAttempt });
      const ir = this.d.pipeline.generate(wp);
      const known: KnownConnection[] = draft.appsRequired.map((integration) => ({ integration, status: "connected" }));
      const preflight = this.d.pipeline.validate({ sessionId: draft.id, ir, knownConnections: known });
      if (!preflight.ok) {
        return fail("build_failed", {}, workflowId, `preflight: ${preflight.issues.filter((i) => i.severity === "error").map((i) => i.code).join(",")}`, "build_blocked");
      }

      // 4. Credentials: vault -> n8n via the existing sync. Nothing secret touches the draft or logs.
      const bound = await this.d.binder.bind(userId, chosen);
      if (!bound.ok) {
        return fail("connection_failed", { app: appLabel(bound.integration) }, workflowId, `credential bind failed for ${bound.integration}`, "build_blocked");
      }

      // 5. Compile and upload INACTIVE, in the user's corner. Retry finds the existing workflow.
      const compiled = this.d.pipeline.compile(ir, bound.attachments);
      const workflow: N8nWorkflow = { ...compiled, name: cornerName(userId, automationId, plan.name), active: false };
      if (!workflowId) workflowId = (await this.d.n8n.find({ userId, automationId }))?.id ?? null;
      const ref = workflowId ? await this.d.n8n.update(workflowId, workflow) : await this.d.n8n.create(workflow);
      workflowId = ref.id;
      if (ref.active) await this.d.n8n.deactivate(workflowId);
      await this.d.n8n.tag(workflowId, [`ac-user-${userId}`, `ac-automation-${automationId}`]);
      await this.d.automations.update(userId, automationId, { n8nWorkflowId: workflowId });
      await this.log(userId, automationId, "built", userMessage("build_in_progress", lang));

      // 6. Real test execution. Every step must succeed.
      const run: TestRunResult = await this.d.n8n.testRun(workflowId, samplePayload(plan));
      await this.d.automations.update(userId, automationId, { testExecutionId: run.executionId });
      const failedStep = run.steps.find((s) => !s.ok);
      if (!run.finished || !run.ok || failedStep) {
        const app = failedStep ? appForNode(ir, failedStep.node) : null;
        return fail(
          app ? "test_failed_app" : "test_failed",
          app ? { app: appLabel(app) } : {},
          workflowId,
          `test run ${run.executionId ?? "none"} failed at ${failedStep?.node ?? "unknown"}: ${failedStep?.error ?? run.detail ?? ""}`,
          "test_failed",
        );
      }
      await this.log(userId, automationId, "test_passed", userMessage("active", lang));

      // 7. Only a fully passing test run may switch it on.
      const on = await this.d.n8n.activate(workflowId);
      if (!on.active) {
        return fail("build_failed", {}, workflowId, "activation did not stick", "build_blocked");
      }
      const message = userMessage("active", lang);
      await this.d.automations.update(userId, automationId, { status: "active", lastMessage: message });
      await this.d.credits.settle({ userId, referenceId });
      await this.d.drafts.update(userId, draft.id, { status: "built" });
      await this.log(userId, automationId, "turned_on", message);
      return { status: "active", draftId: draft.id, automationId, message };
    } catch (error) {
      logTechnical("Build pipeline threw.", { automationId }, error);
      return fail("build_failed", {}, workflowId, error instanceof Error ? error.message : String(error), "build_blocked");
    }
  }

  /* ── Runtime ────────────────────────────────────────────────────── */

  async list(userId: string): Promise<AutomationView[]> {
    return (await this.d.automations.list(userId)).map(toView);
  }

  private async mustGet(userId: string, automationId: string): Promise<AgentAutomation> {
    const a = await this.d.automations.get(userId, automationId);
    if (!a) throw new AgentUserError("not_found", 404, "automation");
    return a;
  }

  async get(userId: string, automationId: string): Promise<AutomationView> {
    return toView(await this.mustGet(userId, automationId));
  }

  async pause(userId: string, automationId: string): Promise<AutomationView> {
    const a = await this.mustGet(userId, automationId);
    if (a.status === "paused") return toView(a);
    if (a.status !== "active" || !a.n8nWorkflowId) throw new AgentUserError("cannot_resume", 409, `pause from ${a.status}`);
    await this.d.n8n.deactivate(a.n8nWorkflowId);
    const message = userMessage("paused", a.language);
    const updated = await this.d.automations.update(userId, automationId, { status: "paused", lastMessage: message });
    await this.log(userId, automationId, "paused", message);
    return toView(updated!);
  }

  async resume(userId: string, automationId: string): Promise<AutomationView> {
    const a = await this.mustGet(userId, automationId);
    if (a.status === "active") return toView(a);
    // Only something that passed its test may run again.
    if ((a.status !== "paused" && a.status !== "needs_attention") || !a.n8nWorkflowId || !a.testExecutionId) {
      throw new AgentUserError("cannot_resume", 409, `resume from ${a.status}`);
    }
    const accounts = await this.d.directory.listAccounts(userId);
    const gate = checkConnections(a.appsRequired, accounts, a.selections);
    if (!gate.ok) throw new AgentUserError("needs_connection", 409, "connection missing on resume");
    await this.d.n8n.activate(a.n8nWorkflowId);
    const message = userMessage("resumed", a.language);
    const updated = await this.d.automations.update(userId, automationId, { status: "active", lastMessage: message, selections: gate.chosen });
    await this.log(userId, automationId, "resumed", message);
    return toView(updated!);
  }

  /** Status synced from n8n. Our record follows what n8n actually reports. */
  async status(userId: string, automationId: string): Promise<AutomationView> {
    const a = await this.mustGet(userId, automationId);
    if (!a.n8nWorkflowId || !this.d.n8n.isConfigured()) return toView(a);
    let ref;
    try {
      ref = await this.d.n8n.get(a.n8nWorkflowId);
    } catch (error) {
      logTechnical("Status sync failed.", { automationId }, error);
      return toView(a);
    }
    if (!ref && a.status === "active") {
      const message = userMessage("build_failed", a.language);
      return toView((await this.d.automations.update(userId, automationId, { status: "needs_attention", lastMessage: message }))!);
    }
    if (ref && a.status === "active" && !ref.active) {
      const message = userMessage("paused", a.language);
      await this.log(userId, automationId, "paused", message);
      return toView((await this.d.automations.update(userId, automationId, { status: "paused", lastMessage: message }))!);
    }
    return toView(a);
  }

  async activity(userId: string, automationId: string) {
    await this.mustGet(userId, automationId);
    return (await this.d.activity.list(userId, automationId)).map(({ kind, message, createdAt }) => ({ kind, message, createdAt }));
  }

  /** Called when a connection is disconnected/expired: pause every automation that uses it. */
  async onConnectionLost(userId: string, integration: string): Promise<number> {
    const affected = (await this.d.automations.list(userId)).filter(
      (a) => a.status === "active" && a.appsRequired.includes(integration),
    );
    for (const a of affected) {
      try {
        if (a.n8nWorkflowId) await this.d.n8n.deactivate(a.n8nWorkflowId);
      } catch (error) {
        logTechnical("Could not pause after connection loss.", { automationId: a.id }, error);
      }
      const message = userMessage("connection_lost", a.language, { app: appLabel(integration) });
      await this.d.automations.update(userId, a.id, { status: "needs_attention", lastMessage: message });
      await this.log(userId, a.id, "connection_lost", message);
    }
    return affected.length;
  }
}

function mergeSelections(existing: ConnectionSelection[], incoming: ConnectionSelection[]): ConnectionSelection[] {
  const map = new Map(existing.map((s) => [s.integration, s]));
  for (const s of incoming) {
    if (typeof s?.integration === "string" && typeof s?.connectionId === "string") map.set(s.integration, s);
  }
  return [...map.values()];
}

/** Map an n8n node name back to the app of the IR step it came from (server-side only). */
function appForNode(ir: AgentWorkflowIR, node: string): string | null {
  const step = ir.core.steps.find((s) => s.name === node || s.id === node);
  if (step?.integration) return step.integration;
  const trigger = ir.core.trigger as { integration?: string };
  return trigger.integration && /trigger/i.test(node) ? trigger.integration : null;
}
