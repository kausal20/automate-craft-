/**
 * Unit tests: preview states, confirm idempotency, connect-once picker,
 * credits reserve/settle/refund, error mapping, runtime, cross-user isolation.
 * Real service + real planner gate + real generator/validator/compiler; fake n8n/vault/credits.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ANSWERS, LEAK, USER_A, USER_B, harness, leadToSheetPlan, noAuthPlan } from "./fakes.test.ts";
import { AgentUserError, redact, toUserResponse, userMessage } from "./errors.ts";
import { checkConnections } from "./gate.ts";
import { cornerTags } from "./test-copy.ts";

async function readyLeadDraft(h: ReturnType<typeof harness>, user = USER_A) {
  h.directory.add(user, "google", "ops@shop.in");
  h.directory.add(user, "email", "owner@shop.in");
  const p = await h.service.preview({ userId: user, prompt: "When a new lead arrives save it to a sheet and email me" });
  return p;
}

/* ── Preview state transitions ───────────────────────────────────── */

test("preview: missing fields -> needs_input with one plain question each, cost shown, nothing built", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  assert.equal(p.status, "needs_input");
  assert.deepEqual(p.questions.map((q) => q.key), ["sheets.sheet", "email.to", "test.email.to"]);
  assert.ok(p.costEstimate > 0);
  assert.match(p.preview, /^I will make this:\n1\. /);
  assert.equal(h.n8n.calls.length, 0);
  assert.equal(h.credits.entries.length, 0);
});

test("preview: no questions but an app not connected -> needs_connection listing the app", async () => {
  // Sheets only (no outbound step, so no owner test question): the only gap is the connection.
  const plan = leadToSheetPlan();
  plan.steps = [{ ...plan.steps[0], next: [], params: { ...plan.steps[0].params, sheet: { source: "literal", value: "Leads" } } }];
  plan.missingFields = [];
  const h = harness({ plan });
  const p = await h.service.preview({ userId: USER_A, prompt: "save leads to my sheet" });
  assert.equal(p.status, "needs_connection");
  assert.deepEqual(p.connections.map((c) => [c.integration, c.state]), [["google", "missing"]]);
});

test("preview: everything known and connected -> ready", async () => {
  const h = harness({ plan: noAuthPlan() });
  const p = await h.service.preview({ userId: USER_A, prompt: "log every incoming event" });
  assert.equal(p.status, "ready");
  assert.equal(p.questions.length, 0);
});

test("preview: unknown app -> rejected with plain reason, persisted, nothing built", async () => {
  const plan = noAuthPlan();
  plan.steps[0] = { ...plan.steps[0], integration: "tallyfoo", operation: "send" };
  const h = harness({ plan });
  const p = await h.service.preview({ userId: USER_A, prompt: "send it to tallyfoo" });
  assert.equal(p.status, "rejected");
  assert.match(p.reason!, /Tallyfoo/);
  assert.doesNotMatch(p.reason!, LEAK);
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true });
  assert.equal(c.status, "blocked");
  assert.equal(h.n8n.calls.length, 0);
});

/* ── Confirm rules ───────────────────────────────────────────────── */

test("confirm without explicit confirm=true builds nothing and charges nothing", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: false, answers: ANSWERS });
  assert.equal(c.status, "not_confirmed");
  assert.equal(h.n8n.calls.length, 0);
  assert.equal(h.credits.entries.length, 0);
});

test("confirm never guesses: a missing or invalid answer returns the question again", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  const c1 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: { "sheets.sheet": "Leads" } });
  assert.equal(c1.status, "needs_input");
  if (c1.status === "needs_input") assert.deepEqual(c1.questions.map((q) => q.key), ["email.to", "test.email.to"]);
  const c2 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: { "email.to": "not-an-email" } });
  assert.equal(c2.status, "needs_input");
  assert.equal(h.n8n.calls.length, 0);
  assert.equal(h.credits.entries.length, 0);
});

test("confirm happy path: reserve -> build INACTIVE in user's corner -> test -> activate -> settle", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  const before = await h.credits.balance(USER_A);
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c.status, "active", JSON.stringify(c));
  if (c.status !== "active") return;

  // Test copy created, run, deleted — THEN the real workflow is created inactive and activated.
  const at = (name: string) => h.n8n.calls.findIndex((x) => x.startsWith(name));
  assert.ok(at("copy-create") >= 0);
  assert.ok(at("copy-create") < at("copy-delete") && at("copy-delete") < at("create") && at("create") < at("activate:"));
  assert.equal(h.n8n.copies.size, 0, "test copy is always deleted");

  const [wfId, wf] = [...h.n8n.workflows.entries()][0];
  assert.ok(wf.workflow.name.startsWith(`ac:${USER_A}:${c.automationId} |`));
  assert.deepEqual(wf.tags, cornerTags(USER_A, c.automationId));
  assert.ok(wf.tags.every((t) => t.length <= 24), "n8n tag names are at most 24 characters");
  assert.equal(wf.active, true);

  const auto = await h.automations.get(USER_A, c.automationId);
  assert.equal(auto!.status, "active");
  assert.equal(auto!.n8nWorkflowId, wfId);
  assert.match(auto!.testExecutionId!, /^exec_copy_/);

  // Credits: one reserve + one settle, both referencing the automation id.
  assert.deepEqual(h.credits.entries.map((e) => e.type), ["reserve", "settle"]);
  assert.ok(h.credits.entries.every((e) => e.referenceId.includes(c.automationId)));
  assert.equal(await h.credits.balance(USER_A), before - p.costEstimate);

  // Answers became literal params; nothing guessed.
  const sheetNode = wf.workflow.nodes.find((n) => n.name === "save_lead");
  assert.ok(JSON.stringify(sheetNode).includes("Leads 2026"));

  // Plain activity trail.
  const acts = await h.service.activity(USER_A, c.automationId);
  assert.deepEqual(acts.map((a) => a.kind), ["test_passed", "built", "turned_on"]);
  for (const a of acts) assert.doesNotMatch(a.message, LEAK);
});

test("confirm is idempotent: twice in a row -> one workflow, one charge", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  const c1 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  const c2 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c1.status, "active");
  assert.equal(c2.status, "active");
  assert.equal(h.n8n.calls.filter((x) => x === "create").length, 1);
  assert.equal(h.credits.entries.filter((e) => e.type === "reserve").length, 1);
});

test("confirm is idempotent under concurrency: parallel confirms -> one workflow, one charge", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  const results = await Promise.all(
    [1, 2, 3].map(() => h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS })),
  );
  assert.ok(results.some((r) => r.status === "active"));
  assert.ok(results.every((r) => r.status === "active" || r.status === "building"));
  assert.equal(h.n8n.calls.filter((x) => x === "create").length, 1);
  assert.equal(h.credits.entries.filter((e) => e.type === "reserve").length, 1);
});

/* ── Connect-once ────────────────────────────────────────────────── */

test("picker: two accounts for one app -> choose, never silent; valid pick is stored and used", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  h.directory.add(USER_A, "google", "ops@shop.in");
  h.directory.add(USER_A, "email", "owner@shop.in");
  const second = h.directory.add(USER_A, "email", "sales@shop.in");
  const p = await h.service.preview({ userId: USER_A, prompt: "save leads and email me" });

  const c1 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c1.status, "needs_connection");
  if (c1.status === "needs_connection") {
    const email = c1.connections.find((x) => x.integration === "email")!;
    assert.equal(email.state, "choose");
    assert.deepEqual(email.options.map((o) => o.label), ["owner@shop.in", "sales@shop.in"]);
  }
  assert.equal(h.n8n.calls.length, 0);

  const c2 = await h.service.confirm({
    userId: USER_A, draftId: p.draftId!, confirm: true, selections: [{ integration: "email", connectionId: second.connectionId }],
  });
  assert.equal(c2.status, "active");
  const used = h.binder.bound.at(-1)!.selections.find((s) => s.integration === "email");
  assert.equal(used!.connectionId, second.connectionId);
});

test("picker: another user's account id is never honoured", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  h.directory.add(USER_A, "google", "a-sheets");
  h.directory.add(USER_A, "email", "a1");
  h.directory.add(USER_A, "email", "a2");
  const foreign = h.directory.add(USER_B, "email", "b-email");
  const p = await h.service.preview({ userId: USER_A, prompt: "x leads" });
  const c = await h.service.confirm({
    userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS,
    selections: [{ integration: "email", connectionId: foreign.connectionId }],
  });
  assert.equal(c.status, "needs_connection");
});

test("connect once: two automations needing the same apps both build without a new connection step", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  h.directory.add(USER_A, "google", "ops@shop.in");
  h.directory.add(USER_A, "email", "owner@shop.in");
  for (const prompt of ["first: save leads and email me", "second: save leads and email me"]) {
    const p = await h.service.preview({ userId: USER_A, prompt });
    assert.equal(p.status, "needs_input"); // questions only, no connection step
    assert.equal(p.connections.length, 0);
    const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
    assert.equal(c.status, "active");
  }
  assert.equal(h.n8n.calls.filter((x) => x === "create").length, 2);
});

test("gate is pure and treats no-login apps as connected", () => {
  assert.deepEqual(checkConnections(["webhook", "forms"], [], []), { ok: true, chosen: [] });
});

/* ── Credits ─────────────────────────────────────────────────────── */

test("credits: not enough -> nothing built, nothing charged, balance never negative", async () => {
  const h = harness({ plan: noAuthPlan(), credits: { [USER_A]: 1 } });
  const p = await h.service.preview({ userId: USER_A, prompt: "log events" });
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true });
  assert.equal(c.status, "insufficient_credits");
  assert.equal(await h.credits.balance(USER_A), 1);
  assert.equal(h.n8n.calls.length, 0);
});

test("credits: failed test -> refund restores the balance exactly", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  h.n8n.failNode = "email_owner";
  const before = await h.credits.balance(USER_A);
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c.status, "failed_test");
  assert.equal(await h.credits.balance(USER_A), before);
  assert.deepEqual(h.credits.entries.map((e) => e.type), ["reserve", "refund"]);
});

test("n8n not configured -> blocked, nothing charged", async () => {
  const h = harness({ plan: noAuthPlan() });
  h.n8n.configured = false;
  const p = await h.service.preview({ userId: USER_A, prompt: "log events" });
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true });
  assert.equal(c.status, "blocked");
  assert.equal(h.credits.entries.length, 0);
});

/* ── Test-run gate ───────────────────────────────────────────────── */

test("broken step: stays OFF, failed_test, refund, plain message naming the app — no node names or codes", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  h.n8n.failNode = "save_lead";
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c.status, "failed_test");
  if (c.status !== "failed_test") return;
  assert.match(c.message, /Google Sheets/);
  assert.doesNotMatch(c.message, LEAK);
  assert.ok(!h.n8n.calls.some((x) => x.startsWith("activate:")), "never activated");
  assert.equal(h.n8n.workflows.size, 0, "the real workflow is never even created");
  assert.equal(h.n8n.copies.size, 0, "test copy deleted after failure");
  assert.ok(h.n8n.calls.includes("copy-deactivate") && h.n8n.calls.includes("copy-delete"));
  const auto = await h.automations.get(USER_A, c.automationId);
  assert.equal(auto!.status, "failed_test");
  const acts = await h.service.activity(USER_A, c.automationId);
  assert.equal(acts.at(-1)!.kind, "test_failed");
});

test("retry after a failed test builds exactly one real workflow, and a second build reuses it", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  h.n8n.failNode = "save_lead";
  const c1 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c1.status, "failed_test");
  h.n8n.failNode = null;
  const c2 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true });
  assert.equal(c2.status, "active");
  assert.equal(h.n8n.calls.filter((x) => x === "create").length, 1);
  assert.equal(h.n8n.calls.filter((x) => x === "update").length, 0);
  assert.equal(h.n8n.workflows.size, 1);
  assert.equal(h.n8n.copies.size, 0);
  // Two attempts: first reserved+refunded, second reserved+settled.
  assert.deepEqual(h.credits.entries.map((e) => e.type), ["reserve", "refund", "reserve", "settle"]);
});

test("credential bind failure: blocked before upload, plain message, refund", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  h.binder.failFor = "email";
  const before = await h.credits.balance(USER_A);
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(c.status, "failed_test");
  if (c.status === "failed_test") assert.match(c.message, /Email/);
  assert.equal(h.n8n.calls.filter((x) => x === "create").length, 0);
  assert.equal(await h.credits.balance(USER_A), before);
});

/* ── Runtime ─────────────────────────────────────────────────────── */

async function activeAutomation(h: ReturnType<typeof harness>, user = USER_A) {
  const p = await h.service.preview({ userId: user, prompt: "log events" });
  const c = await h.service.confirm({ userId: user, draftId: p.draftId!, confirm: true });
  assert.equal(c.status, "active");
  return (c as { automationId: string }).automationId;
}

test("pause / resume / status sync, each with a plain activity entry", async () => {
  const h = harness({ plan: noAuthPlan() });
  const id = await activeAutomation(h);
  assert.equal((await h.service.pause(USER_A, id)).status, "paused");
  assert.equal((await h.service.resume(USER_A, id)).status, "active");

  // Someone switched it off directly in the engine: status follows reality.
  const wfId = (await h.automations.get(USER_A, id))!.n8nWorkflowId!;
  await h.n8n.deactivate(wfId);
  assert.equal((await h.service.status(USER_A, id)).status, "paused");

  const kinds = (await h.service.activity(USER_A, id)).map((a) => a.kind);
  assert.deepEqual(kinds, ["test_passed", "built", "turned_on", "paused", "resumed", "paused"]);
});

test("cannot switch on something that never passed its test", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  h.n8n.failNode = "save_lead";
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  await assert.rejects(h.service.resume(USER_A, (c as { automationId: string }).automationId), (e: unknown) => e instanceof AgentUserError && e.key === "cannot_resume");
});

test("connection lost: dependent automations pause with a plain status", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  const p = await readyLeadDraft(h);
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: ANSWERS });
  const id = (c as { automationId: string }).automationId;
  assert.equal(await h.service.onConnectionLost(USER_A, "email"), 1);
  const v = await h.service.get(USER_A, id);
  assert.equal(v.status, "needs_attention");
  assert.match(v.message!, /Email \(SMTP\) connection stopped working/);
  assert.equal([...h.n8n.workflows.values()][0].active, false);
  // Resume refuses while the connection is still missing.
  h.directory.accounts = h.directory.accounts.filter((a) => a.integration !== "email");
  await assert.rejects(h.service.resume(USER_A, id), (e: unknown) => e instanceof AgentUserError && e.key === "needs_connection");
});

/* ── Cross-user isolation ────────────────────────────────────────── */

test("user B cannot see, confirm, pause, resume, sync or read activity of user A's work", async () => {
  const h = harness({ plan: noAuthPlan() });
  const p = await h.service.preview({ userId: USER_A, prompt: "log events" });
  await assert.rejects(h.service.confirm({ userId: USER_B, draftId: p.draftId!, confirm: true }), notFound);
  await assert.rejects(h.service.getDraft(USER_B, p.draftId!), notFound);

  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true });
  const id = (c as { automationId: string }).automationId;
  const callsBefore = h.n8n.calls.length;

  assert.deepEqual(await h.service.list(USER_B), []);
  await assert.rejects(h.service.get(USER_B, id), notFound);
  await assert.rejects(h.service.pause(USER_B, id), notFound);
  await assert.rejects(h.service.resume(USER_B, id), notFound);
  await assert.rejects(h.service.status(USER_B, id), notFound);
  await assert.rejects(h.service.activity(USER_B, id), notFound);
  assert.equal(await h.service.onConnectionLost(USER_B, "webhook"), 0);

  assert.equal(h.n8n.calls.length, callsBefore, "B's attempts never reached the engine");
  assert.equal((await h.service.get(USER_A, id)).status, "active");
  assert.equal(h.credits.entries.filter((e) => e.userId === USER_B).length, 0);
});

const notFound = (e: unknown) => e instanceof AgentUserError && e.key === "not_found";

/* ── Error mapping ───────────────────────────────────────────────── */

test("error mapping: unknown errors become a plain message with no stack, code or secret", () => {
  const err = new Error("N8nApiError: POST /workflows failed with 500: {\"apiKey\":\"sk-or-v1-abcdef1234567890abcdef\"}");
  const { status, body } = toUserResponse(err);
  assert.equal(status, 500);
  assert.doesNotMatch(body.error, LEAK);
  assert.doesNotMatch(body.error, /sk-or/);
});

test("error mapping: known errors keep their status and speak the user's language", () => {
  assert.equal(toUserResponse(new AgentUserError("not_found", 404)).status, 404);
  assert.match(userMessage("active", "hinglish"), /chalu/);
  assert.match(userMessage("active", "hi"), /चालू/);
  assert.match(userMessage("connection_lost", "en", { app: "WhatsApp" }), /WhatsApp connection stopped/);
});

test("redact hides keys and tokens in log text", () => {
  const text = "key AIzaSyA1234567890abcdefghijkl and sk-or-v1-abcdef1234567890 and token=supersecretvalue and sb_secret_abcdefghijklmnop";
  const out = redact(text);
  assert.doesNotMatch(out, /AIzaSy|sk-or-v1|supersecretvalue|sb_secret_abc/);
});
