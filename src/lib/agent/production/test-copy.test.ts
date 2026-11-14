/**
 * Test-copy gate with a mocked n8n: pass, fail, timeout, crash. The copy is
 * ALWAYS deactivated and deleted. Also: copy shape, owner-only recipients,
 * money-step guard, and the live webhook base derivation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { N8nWorkflow } from "@/lib/adapters/n8n/client/types";
import { N8N_TRIGGER_NODE_NAME } from "@/lib/adapters/n8n/compiler/trigger-mapper";
import { buildTestCopy, cornerTags, runTestCopy, TEST_COPY_TAG, type ExecutionSnapshot, type N8nTestClient } from "./test-copy.ts";
import { applyTestRecipients, moneySteps, testRecipientFields, unansweredTestRecipients } from "./safety.ts";
import { ANSWERS, LEAK, USER_A, harness, leadToSheetPlan } from "./fakes.test.ts";
import type { BrainPlan } from "../brain/plan-schema.ts";

const AUTO = "00000000-0000-4000-9000-000000000099";

const WORKFLOW: N8nWorkflow = {
  name: "real",
  nodes: [
    { name: N8N_TRIGGER_NODE_NAME, type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1, position: [10, 20], parameters: { rule: "x" } },
    { name: "save_lead", type: "n8n-nodes-base.googleSheets", typeVersion: 4, position: [200, 20], parameters: {} },
  ],
  connections: { [N8N_TRIGGER_NODE_NAME]: { main: [[{ node: "save_lead", type: "main", index: 0 }]] } },
};

type Mode = "pass" | "fail" | "timeout" | "crash_on_activate" | "webhook_error";

function mockClient(mode: Mode) {
  const log: string[] = [];
  let clock = 0;
  let executed = false;
  const alive = new Set<string>();
  const client: N8nTestClient = {
    create: async (wf) => {
      log.push(`create:${wf.name.split(" |")[0]}`);
      alive.add("c1");
      return { id: "c1" };
    },
    tag: async (_id, tags) => void log.push(`tag:${tags.join(",")}`),
    activate: async () => {
      log.push("activate");
      if (mode === "crash_on_activate") throw new Error("n8n 500 while activating");
    },
    deactivate: async () => void log.push("deactivate"),
    remove: async (id) => {
      log.push("delete");
      alive.delete(id);
    },
    postWebhook: async (path) => {
      log.push(`post:${path}`);
      if (mode === "webhook_error") throw new Error("socket hang up");
      executed = true;
    },
    latestExecution: async (): Promise<ExecutionSnapshot | null> => {
      if (!executed && mode !== "webhook_error") return null;
      if (mode === "timeout") return { id: "e1", finished: false, status: "running", runData: {} };
      if (mode === "fail") {
        return { id: "e1", finished: true, status: "error", runData: { [N8N_TRIGGER_NODE_NAME]: [{}], save_lead: [{ error: { message: "401 Unauthorized" } }] } };
      }
      if (mode === "webhook_error") return { id: "e1", finished: true, status: "success", runData: { [N8N_TRIGGER_NODE_NAME]: [{}], save_lead: [{}] } };
      return { id: "e1", finished: true, status: "success", runData: { [N8N_TRIGGER_NODE_NAME]: [{}], save_lead: [{}] } };
    },
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
  };
  return { client, log, alive };
}

const input = { userId: USER_A, automationId: AUTO, workflow: WORKFLOW, payload: { lead: { name: "T" } }, nonce: "abc123", pollIntervalMs: 100, timeoutMs: 1000 };

test("copy: trigger replaced by a unique POST webhook that answers when the last node finishes; connections kept", () => {
  const copy = buildTestCopy(WORKFLOW, { userId: USER_A, automationId: AUTO, nonce: "abc123" });
  const hook = copy.workflow.nodes[0];
  assert.equal(hook.name, N8N_TRIGGER_NODE_NAME);
  assert.equal(hook.type, "n8n-nodes-base.webhook");
  assert.equal(hook.parameters.httpMethod, "POST");
  assert.equal(hook.parameters.responseMode, "lastNode");
  assert.equal(hook.parameters.path, copy.path);
  assert.equal(hook.webhookId, copy.path);
  assert.ok(copy.path.endsWith("-abc123"));
  assert.equal(copy.workflow.nodes.filter((n) => n.name === N8N_TRIGGER_NODE_NAME).length, 1);
  assert.deepEqual(copy.workflow.connections, WORKFLOW.connections);
  assert.ok(copy.workflow.name.startsWith(`ac-test:${USER_A}:${AUTO}:abc123`));
  assert.deepEqual(copy.tags, [TEST_COPY_TAG, ...cornerTags(USER_A, AUTO)]);
  assert.ok(copy.tags.every((t) => t.length <= 24));
  assert.equal(WORKFLOW.nodes[0].type, "n8n-nodes-base.scheduleTrigger", "original is not mutated");
});

test("copy paths differ per run and per automation", () => {
  const a = buildTestCopy(WORKFLOW, { userId: USER_A, automationId: AUTO, nonce: "n1" }).path;
  const b = buildTestCopy(WORKFLOW, { userId: USER_A, automationId: AUTO, nonce: "n2" }).path;
  const c = buildTestCopy(WORKFLOW, { userId: USER_A, automationId: "other", nonce: "n1" }).path;
  assert.equal(new Set([a, b, c]).size, 3);
});

test("PASS: create -> tag -> activate -> POST -> poll -> success; copy deactivated and deleted", async () => {
  const m = mockClient("pass");
  const r = await runTestCopy(m.client, input);
  assert.equal(r.ok, true);
  assert.equal(r.finished, true);
  assert.equal(r.executionId, "e1");
  assert.ok(r.steps.every((s) => s.ok));
  assert.deepEqual(m.log.map((l) => l.split(":")[0]), ["create", "tag", "activate", "post", "deactivate", "delete"]);
  assert.equal(m.alive.size, 0);
});

test("FAIL: a step error fails the run, names the failing node (server-side), copy cleaned up", async () => {
  const m = mockClient("fail");
  const r = await runTestCopy(m.client, input);
  assert.equal(r.ok, false);
  assert.deepEqual(r.steps.find((s) => !s.ok), { node: "save_lead", ok: false, error: "401 Unauthorized" });
  assert.deepEqual(m.log.slice(-2), ["deactivate", "delete"]);
  assert.equal(m.alive.size, 0);
});

test("TIMEOUT: an execution that never finishes fails after the deadline; copy cleaned up", async () => {
  const m = mockClient("timeout");
  const r = await runTestCopy(m.client, input);
  assert.equal(r.ok, false);
  assert.equal(r.finished, false);
  assert.match(r.detail!, /timed out/);
  assert.deepEqual(m.log.slice(-2), ["deactivate", "delete"]);
  assert.equal(m.alive.size, 0);
});

test("CRASH: an n8n error mid-run fails safely and still cleans up the copy", async () => {
  const m = mockClient("crash_on_activate");
  const r = await runTestCopy(m.client, input);
  assert.equal(r.ok, false);
  assert.match(r.detail!, /test copy failed/);
  assert.deepEqual(m.log.slice(-2), ["deactivate", "delete"]);
  assert.equal(m.alive.size, 0);
});

test("a webhook response error does not decide the result; the execution record does", async () => {
  const m = mockClient("webhook_error");
  const r = await runTestCopy(m.client, input);
  assert.equal(r.ok, true);
});

/* ── Owner-only test recipients ──────────────────────────────────── */

function waLeadPlan(): BrainPlan {
  const plan = leadToSheetPlan();
  plan.steps.push({
    id: "reply_lead", label: "Reply to the lead on WhatsApp", kind: "notification", integration: "whatsapp", operation: "send_message",
    params: { to: { source: "trigger", ref: "lead.phone" }, body: { source: "literal", value: "Namaste!" } }, next: [], errorPolicy: "fail",
  });
  plan.steps.push({
    id: "ping_partner", label: "Tell my partner", kind: "notification", integration: "whatsapp", operation: "send_message",
    params: { to: { source: "literal", value: "+919811111111" }, body: { source: "literal", value: "New lead" } }, next: [], errorPolicy: "fail",
  });
  return plan;
}

test("every outbound app gets ONE owner-only test question — dynamic and fixed recipients alike", () => {
  const fields = testRecipientFields(waLeadPlan());
  assert.deepEqual(fields.map((f) => f.key), ["test.email.to", "test.whatsapp.to"]);
  assert.match(fields[1].question, /YOUR OWN WhatsApp/);
  assert.match(testRecipientFields({ ...waLeadPlan(), language: "hinglish" })[1].question, /APNA/);
});

test("test answers are validated, never guessed", () => {
  assert.deepEqual(unansweredTestRecipients(waLeadPlan(), {}).map((f) => f.key), ["test.email.to", "test.whatsapp.to"]);
  assert.deepEqual(unansweredTestRecipients(waLeadPlan(), { "test.email.to": "x", "test.whatsapp.to": "+91 99999 00000" }).map((f) => f.key), ["test.email.to"]);
  assert.throws(() => applyTestRecipients(waLeadPlan(), {}), /No owner test recipient/);
});

test("the test plan sends ONLY to the owner; the real plan keeps its real recipients", () => {
  const plan = waLeadPlan();
  const test_ = applyTestRecipients(plan, { "test.email.to": "me@shop.in", "test.whatsapp.to": "+91 90000 00001" });
  for (const s of test_.steps) {
    if (s.integration === "whatsapp") assert.deepEqual(s.params.to, { source: "literal", value: "+91 90000 00001" });
    if (s.integration === "email") assert.deepEqual(s.params.to, { source: "literal", value: "me@shop.in" });
  }
  assert.deepEqual(plan.steps.find((s) => s.id === "reply_lead")!.params.to, { source: "trigger", ref: "lead.phone" });
  assert.deepEqual(plan.steps.find((s) => s.id === "ping_partner")!.params.to, { source: "literal", value: "+919811111111" });
});

test("service: the compiled test copy carries the owner's test address, the real workflow the real one", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  h.directory.add(USER_A, "sheets", "ops@shop.in");
  h.directory.add(USER_A, "email", "owner@shop.in");
  const p = await h.service.preview({ userId: USER_A, prompt: "save leads and email me" });
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c.status, "active");
  const testNode = h.n8n.lastTestWorkflow!.nodes.find((n) => n.name === "email_owner");
  const realNode = [...h.n8n.workflows.values()][0].workflow.nodes.find((n) => n.name === "email_owner");
  assert.ok(JSON.stringify(testNode).includes("me-test@shop.in"));
  assert.ok(!JSON.stringify(testNode).includes("owner@example.com"));
  assert.ok(JSON.stringify(realNode).includes("owner@example.com"));
});

test("service: TIMEOUT in the test copy -> failed_test, real workflow never created, refund, plain message", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  h.directory.add(USER_A, "sheets", "ops@shop.in");
  h.directory.add(USER_A, "email", "owner@shop.in");
  const p = await h.service.preview({ userId: USER_A, prompt: "save leads and email me" });
  h.n8n.hang = true;
  const before = await h.credits.balance(USER_A);
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c.status, "failed_test");
  assert.doesNotMatch(c.message, LEAK);
  assert.equal(h.n8n.workflows.size, 0);
  assert.equal(h.n8n.copies.size, 0);
  assert.equal(await h.credits.balance(USER_A), before);
});

test("money-moving steps cannot be test-run safely: rejected at preview, nothing charged", async () => {
  const plan: BrainPlan = {
    ...leadToSheetPlan(),
    steps: [{
      id: "charge", label: "Charge the customer", kind: "action", integration: "stripe", operation: "create_charge",
      params: { amount: { source: "trigger", ref: "order.amount" }, currency: { source: "literal", value: "INR" }, source: { source: "trigger", ref: "order.card" } },
      next: [], errorPolicy: "fail",
    }],
    missingFields: [],
  };
  assert.deepEqual(moneySteps(plan), ["charge"]);
  const h = harness({ plan });
  const p = await h.service.preview({ userId: USER_A, prompt: "charge the customer when an order arrives" });
  assert.equal(p.status, "rejected");
  assert.match(p.reason!, /real payment/);
  assert.equal(h.credits.entries.length, 0);
});

test("live webhook base is derived from N8N_API_URL", async () => {
  const { n8nWebhookBase } = await import("./live.ts");
  assert.equal(n8nWebhookBase("https://n8n.shop.in/api/v1"), "https://n8n.shop.in");
  assert.equal(n8nWebhookBase("http://localhost:5678/api/v1/"), "http://localhost:5678");
  assert.equal(n8nWebhookBase("https://x.io/n8n/api/v1"), "https://x.io/n8n");
});
