/**
 * Test harness (no tests here). Fakes for the n8n hands, the vault directory
 * and credential binder, plus a mocked Gemini, wired into the REAL service,
 * REAL planner/catalogue gate and REAL generator/validator/compiler.
 */
import type { N8nWorkflow } from "@/lib/adapters/n8n/client/types";
import { buildProductionCatalogue, type AppCatalogue } from "../brain/catalogue.ts";
import { DeterministicBrain } from "../brain/fallback.ts";
import { GeminiPlanner } from "../brain/gemini.ts";
import { createPlanner } from "../brain/planner.ts";
import type { BrainPlan } from "../brain/plan-schema.ts";
import { compileIrToN8n } from "../deployment/compiler.ts";
import { workflowGenerator } from "../generation/index.ts";
import { workflowValidator } from "../validation/index.ts";
import { MemoryActivityLog, MemoryAutomationRepo, MemoryCreditLedger, MemoryDraftRepo } from "./memory.ts";
import { AgentService, type BuildPipeline } from "./service.ts";
import type {
  ConnectionDirectory,
  ConnectionSelection,
  CredentialBinder,
  N8nGateway,
  N8nRef,
  SavedAccount,
  TestRunResult,
} from "./types.ts";

export const USER_A = "00000000-0000-4000-8000-00000000000a";
export const USER_B = "00000000-0000-4000-8000-00000000000b";

export class FakeN8n implements N8nGateway {
  configured = true;
  workflows = new Map<string, { workflow: N8nWorkflow; active: boolean; tags: string[] }>();
  calls: string[] = [];
  /** Node name (step id) that fails in the test run, or null for a clean pass. */
  failNode: string | null = null;
  private seq = 0;

  isConfigured() {
    return this.configured;
  }
  async find({ userId, automationId }: { userId: string; automationId: string }): Promise<N8nRef | null> {
    this.calls.push("find");
    const prefix = `ac:${userId}:${automationId} |`;
    for (const [id, w] of this.workflows) if (w.workflow.name.startsWith(prefix)) return { id, active: w.active };
    return null;
  }
  async create(workflow: N8nWorkflow) {
    this.calls.push("create");
    this.seq += 1;
    const id = `wf_${this.seq}`;
    this.workflows.set(id, { workflow, active: false, tags: [] });
    return { id, active: false };
  }
  async update(id: string, workflow: N8nWorkflow) {
    this.calls.push("update");
    const w = this.workflows.get(id);
    if (!w) throw new Error("n8n 404 workflow not found");
    w.workflow = workflow;
    return { id, active: w.active };
  }
  async tag(id: string, tags: string[]) {
    this.calls.push("tag");
    this.workflows.get(id)!.tags = tags;
  }
  async activate(id: string) {
    this.calls.push(`activate:${id}`);
    const w = this.workflows.get(id)!;
    w.active = true;
    return { id, active: true };
  }
  async deactivate(id: string) {
    this.calls.push(`deactivate:${id}`);
    const w = this.workflows.get(id);
    if (w) w.active = false;
    return { id, active: false };
  }
  async get(id: string) {
    const w = this.workflows.get(id);
    return w ? { id, active: w.active } : null;
  }
  async testRun(id: string, payload: Record<string, unknown>): Promise<TestRunResult> {
    this.calls.push(`test:${id}`);
    this.lastPayload = payload;
    const nodes = this.workflows.get(id)!.workflow.nodes.map((n) => n.name);
    const steps = nodes.map((node) =>
      node === this.failNode ? { node, ok: false, error: `NodeApiError: 401 Unauthorized at ${node} (stack: at x.js:1)` } : { node, ok: true },
    );
    return { executionId: `exec_${id}`, finished: true, ok: steps.every((s) => s.ok), steps };
  }
  lastPayload: Record<string, unknown> | null = null;
}

export class FakeDirectory implements ConnectionDirectory {
  accounts: SavedAccount[] = [];
  async listAccounts(userId: string) {
    // Accounts are stored per user; the id encodes the owner, like the real vault rows.
    return this.accounts.filter((a) => a.connectionId.startsWith(`${userId}:`));
  }
  add(userId: string, integration: string, label: string, usable = true) {
    const acc = { connectionId: `${userId}:${integration}:${label}`, integration, label, usable };
    this.accounts.push(acc);
    return acc;
  }
}

export class FakeBinder implements CredentialBinder {
  bound: Array<{ userId: string; selections: ConnectionSelection[] }> = [];
  failFor: string | null = null;
  async bind(userId: string, selections: ConnectionSelection[]) {
    this.bound.push({ userId, selections });
    if (this.failFor && selections.some((s) => s.integration === this.failFor)) return { ok: false as const, integration: this.failFor };
    return { ok: true as const, attachments: {} };
  }
}

export const realPipeline: BuildPipeline = {
  generate: (plan) => workflowGenerator.generate({ plan, version: plan.version }),
  validate: (input) => workflowValidator.validate(input),
  compile: (ir, attachments) => compileIrToN8n(ir, attachments).workflow,
};

export function geminiReturning(plan: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(plan) }] } }] }), {
      status: 200,
    })) as typeof fetch;
}

export function harness(opts: { plan?: BrainPlan | null; credits?: Record<string, number>; catalogue?: AppCatalogue } = {}) {
  const n8n = new FakeN8n();
  const directory = new FakeDirectory();
  const binder = new FakeBinder();
  const credits = new MemoryCreditLedger(opts.credits ?? { [USER_A]: 100, [USER_B]: 100 });
  const drafts = new MemoryDraftRepo();
  const automations = new MemoryAutomationRepo();
  const activity = new MemoryActivityLog();
  let planToReturn: BrainPlan | null = opts.plan ?? null;
  let fetchCalls = 0;
  const planner = createPlanner({
    primary: new GeminiPlanner({
      apiKey: "test-key",
      plannerModel: "test-model",
      lightModel: "test-light",
      fetchImpl: (async (...args: Parameters<typeof fetch>) => {
        fetchCalls += 1;
        return geminiReturning(planToReturn)(...args);
      }) as typeof fetch,
    }),
    fallback: new DeterministicBrain(),
  });
  let idSeq = 0;
  const service = new AgentService({
    planner,
    catalogue: () => opts.catalogue ?? buildProductionCatalogue(),
    drafts,
    automations,
    activity,
    credits,
    directory,
    binder,
    n8n,
    pipeline: realPipeline,
    newId: () => {
      idSeq += 1;
      return `00000000-0000-4000-9000-${String(idSeq).padStart(12, "0")}`;
    },
  });
  return {
    service, n8n, directory, binder, credits, drafts, automations, activity,
    setPlan: (p: BrainPlan) => { planToReturn = p; },
    fetchCalls: () => fetchCalls,
  };
}

/* ── Plans that use only apps in the REAL catalogue ───────────────── */

/** Webhook lead -> Google Sheet row -> email to the owner (owner email is asked, never guessed). */
export function leadToSheetPlan(): BrainPlan {
  return {
    name: "Save new leads",
    summary: "Every new lead is saved to a sheet and the owner gets an email.",
    language: "en",
    trigger: { kind: "webhook", integration: null, config: { event: "new_lead" } },
    steps: [
      {
        id: "save_lead", label: "Save the lead to your Google Sheet", kind: "save", integration: "sheets", operation: "append_row",
        params: { values: { source: "trigger", ref: "lead.name" } }, next: ["email_owner"], errorPolicy: "retry",
      },
      {
        id: "email_owner", label: "Email you about the new lead", kind: "notification", integration: "email", operation: "send_email",
        params: { subject: { source: "literal", value: "New lead" }, body: { source: "template", value: "New lead: {{lead.name}}" } },
        next: [], errorPolicy: "fail",
      },
    ],
    appsRequired: [],
    missingFields: [
      { key: "sheets.sheet", stepId: "save_lead", param: "sheet", question: "Which Google Sheet should I save leads to?" },
      { key: "email.to", stepId: "email_owner", param: "to", question: "Which email address should I send alerts to?" },
    ],
    unsupportedRequests: [],
  };
}

/** No login needed at all: webhook -> log. Used where connections are not the point. */
export function noAuthPlan(): BrainPlan {
  return {
    name: "Log incoming events",
    summary: "Every incoming event is written to your activity log.",
    language: "en",
    trigger: { kind: "webhook", integration: null, config: { event: "inbound" } },
    steps: [
      {
        id: "log_it", label: "Write it to your activity log", kind: "save", integration: null, operation: "log_event",
        params: { message: { source: "literal", value: "Event received" } }, next: [], errorPolicy: "fail",
      },
    ],
    appsRequired: [],
    missingFields: [],
    unsupportedRequests: [],
  };
}

export const ANSWERS = { "sheets.sheet": "Leads 2026", "email.to": "owner@example.com" };

/** Words that must never reach an owner. */
export const LEAK = /(n8n|node|stack|\.js|error code|nodeapierror|401|500|exception|save_lead|email_owner|undefined|null)/i;
