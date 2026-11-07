import {
  buildDeterministicWorkflow,
  getWorkflowFieldDefinitions,
  type AutomationRecord,
  type AutomationStatus,
  type AutomationWorkflow,
  type ConnectionStatus,
} from "@/lib/automation";
import { mockChatResponse } from "./chat-stream";
import { CREDIT_PACKAGES, PLANS } from "./data/credits";
import { buildRunLogs } from "./data/runs";
import { DEMO_USER } from "./data/user";
import { getDb, updateDb, type MockDb } from "./db";
import { clearSessionCookie, hasSessionCookie, setSessionCookie } from "./session";

/**
 * Fake backend: one handler per /api route the UI calls. Response shapes match
 * src/app/api/* on main, so UI written here keeps working against the real API.
 */

type Body = Record<string, unknown>;
type Ctx = { params: string[]; body: Body; url: URL };
type Handler = (ctx: Ctx) => Response | Promise<Response>;

const RUN_COST = 4;
const GENERATE_COST = 12;
const SIMULATED_VERIFY_MS = 6000;

const json = (data: unknown, status = 200) => Response.json(data, { status });
const fail = (error: string, status = 400) => json({ error }, status);

function runSummary(db: MockDb, automation: AutomationRecord) {
  const runs = db.runs.filter((run) => run.automationId === automation.id);
  return {
    ...automation,
    runsCount: runs.length,
    lastRunAt: runs[0]?.createdAt ?? null,
    lastRunStatus: runs[0]?.status ?? null,
  };
}

function spendCredits(db: MockDb, amount: number, description: string) {
  const { credits } = db;
  if (credits.planCredits + credits.extraCredits < amount) return false;
  const fromPlan = Math.min(credits.planCredits, amount);
  credits.planCredits -= fromPlan;
  credits.extraCredits -= amount - fromPlan;
  credits.monthlyUsage += amount;
  db.creditEvents.unshift({ id: `tx-${Date.now()}`, amount: -amount, description, createdAt: new Date().toISOString() });
  return true;
}

function grantCredits(db: MockDb, amount: number, description: string, target: "planCredits" | "extraCredits") {
  db.credits[target] += amount;
  db.creditEvents.unshift({ id: `tx-${Date.now()}`, amount, description, createdAt: new Date().toISOString() });
}

const handlers: Record<string, Handler> = {
  /* Automations */
  "GET /api/automations": ({ url }) => {
    const db = getDb();
    const limit = Number(url.searchParams.get("limit")) || db.automations.length;
    return json({ automations: db.automations.slice(0, limit).map((a) => runSummary(db, a)) });
  },
  "GET /api/automations/:id": ({ params }) => {
    const automation = getDb().automations.find((a) => a.id === params[0]);
    if (!automation) return fail("Automation not found.", 404);
    return json({ automation, fieldDefinitions: getWorkflowFieldDefinitions(automation.workflow) });
  },
  "PATCH /api/automations/:id": ({ params, body }) =>
    updateDb((db) => {
      const automation = db.automations.find((a) => a.id === params[0]);
      if (!automation) return fail("Automation not found.", 404);
      if (typeof body.name === "string") automation.name = body.name;
      if (body.status) automation.status = body.status as AutomationStatus;
      if (body.formInputs) automation.formInputs = body.formInputs as Record<string, string>;
      automation.updatedAt = new Date().toISOString();
      return json({ automation });
    }),
  "DELETE /api/automations/:id": ({ params }) =>
    updateDb((db) => {
      db.automations = db.automations.filter((a) => a.id !== params[0]);
      db.runs = db.runs.filter((run) => run.automationId !== params[0]);
      return json({ ok: true });
    }),
  "POST /api/run-automation": ({ body }) =>
    updateDb((db) => {
      const automation = db.automations.find((a) => a.id === body.automationId);
      if (!automation) return fail("Automation not found.", 404);
      if (!spendCredits(db, RUN_COST, "Executed Automation")) return fail("Not enough credits.", 402);
      const now = Date.now();
      const run = {
        id: `run-${now}`,
        automationId: automation.id,
        userId: automation.userId,
        status: "success" as const,
        logs: buildRunLogs(automation, now),
        triggerSource: "manual" as const,
        payload: {},
        result: { delivered: true },
        errorMessage: null,
        createdAt: new Date(now).toISOString(),
        finishedAt: new Date(now + 2000).toISOString(),
      };
      db.runs.unshift(run);
      return json({ run, mode: "legacy" });
    }),
  "POST /api/generate-automation": ({ body }) =>
    updateDb((db) => {
      if (!spendCredits(db, GENERATE_COST, "Generated workflow")) return fail("Not enough credits.", 402);
      const workflow = buildDeterministicWorkflow(String(body.prompt ?? "New automation"));
      return json({ workflow, fieldDefinitions: getWorkflowFieldDefinitions(workflow), source: "mock", cost: GENERATE_COST });
    }),
  "POST /api/save-automation": ({ body }) =>
    updateDb((db) => {
      const workflow = body.workflow as AutomationWorkflow;
      const id = `auto-${Date.now()}`;
      const now = new Date().toISOString();
      const automation: AutomationRecord = {
        id,
        userId: DEMO_USER.id,
        name: workflow.name,
        status: "active",
        workflow,
        formInputs: (body.formInputs as Record<string, string>) ?? {},
        integrationStatus: (body.integrationStatus as Record<string, ConnectionStatus>) ?? {},
        webhookId: `wh_${id}`,
        createdAt: now,
        updatedAt: now,
      };
      db.automations.unshift(automation);
      return json({ automation });
    }),

  /* Logs and credits */
  "GET /api/logs": () => {
    const db = getDb();
    const names = new Map(db.automations.map((a) => [a.id, a.name]));
    return json({
      logs: db.runs.map((run) => ({ ...run, automationName: names.get(run.automationId) ?? "Unknown automation" })),
    });
  },
  "GET /api/credits": () => {
    const { credits, creditEvents } = getDb();
    return json({
      ...credits,
      totalCredits: credits.planCredits + credits.extraCredits,
      usageHistory: creditEvents.filter((event) => event.amount < 0),
    });
  },
  "GET /api/credit-transactions": () => json({ transactions: getDb().creditEvents }),
  "POST /api/buy-credits": ({ body }) =>
    updateDb((db) => {
      const amount =
        body.packageId === "custom" ? Number(body.customCredits) : CREDIT_PACKAGES[String(body.packageId)];
      if (!amount) return fail("Invalid package");
      if (body.packageId === "custom" && amount < 600) return fail("Minimum custom credit top-up is 600");
      grantCredits(db, amount, `${amount} Credits Top-up`, "extraCredits");
      return json({ success: true, creditsAdded: amount });
    }),
  "POST /api/subscribe": ({ body }) =>
    updateDb((db) => {
      const plan = PLANS[String(body.planId)];
      if (!plan) return fail("Invalid plan");
      db.credits.hasSubscription = true;
      grantCredits(db, plan.credits, `${plan.name} plan`, "planCredits");
      return json({ success: true, planId: body.planId, planName: plan.name, creditsGranted: plan.credits });
    }),

  /* Integrations */
  "GET /api/integrations": () => json({ integrations: getDb().connections }),
  "POST /api/integrations/connect": ({ body }) =>
    updateDb((db) => {
      const existing = db.connections.find((c) => c.integration === body.integration);
      const connection = {
        integration: String(body.integration),
        status: "connected" as const,
        updatedAt: new Date().toISOString(),
      };
      if (existing) Object.assign(existing, connection);
      else db.connections.push(connection);
      return json({ connection });
    }),

  /* Auth: any input succeeds */
  "POST /api/auth/login": () => {
    setSessionCookie();
    return json({ user: DEMO_USER });
  },
  "POST /api/auth/signup": () => {
    updateDb((db) => {
      db.signupAt = Date.now();
    });
    return json({ user: { ...DEMO_USER, emailVerified: false }, needsEmailVerification: true });
  },
  // Simulates the user clicking the emailed link a few seconds after signup.
  "GET /api/auth/session": () => {
    const { signupAt } = getDb();
    const verified = signupAt !== null && Date.now() - signupAt > SIMULATED_VERIFY_MS;
    if (verified) {
      setSessionCookie();
      updateDb((db) => {
        db.signupAt = null;
      });
    }
    return json({ user: DEMO_USER, emailVerified: verified || hasSessionCookie() });
  },
  "POST /api/auth/logout": () => {
    clearSessionCookie();
    return json({ ok: true });
  },
  "POST /api/auth/magic-link": () => json({ success: true }),
  "POST /api/auth/reset-password": () => json({ success: true }),
  "POST /api/auth/delete": () => {
    clearSessionCookie();
    return json({ success: true });
  },
  "DELETE /api/user": () => {
    clearSessionCookie();
    return json({ success: true });
  },
  "POST /api/user/onboard": () => json({ success: true }),

  /* Forms */
  "POST /api/contact": () => json({ success: true, message: "Contact request received successfully." }),
  "POST /api/feedback": () => json({ ok: true }),
};

const routes = Object.entries(handlers).map(([key, handler]) => {
  const [method, path] = key.split(" ");
  return { method, pattern: new RegExp(`^${path.replace(/:[a-z]+/g, "([^/]+)")}$`), handler };
});

const latency = () => new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 200));

export async function handleMockRequest(url: URL, method: string, rawBody: string | null): Promise<Response> {
  let body: Body = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as Body) : {};
  } catch {
    // Non-JSON body: handlers treat it as empty.
  }

  if (method === "POST" && url.pathname === "/api/chat") {
    return mockChatResponse(body as Parameters<typeof mockChatResponse>[0]);
  }

  await latency();

  for (const route of routes) {
    const match = route.method === method ? url.pathname.match(route.pattern) : null;
    if (match) return route.handler({ params: match.slice(1), body, url });
  }

  console.warn(`[prototype] No mock for ${method} ${url.pathname}. Add one in src/mock/api.ts.`);
  return fail(`No mock for ${method} ${url.pathname}`, 501);
}
