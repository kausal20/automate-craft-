/**
 * Integration: mocked Gemini + mocked n8n, everything else real.
 *   prompt -> preview -> confirm -> build -> test pass -> active
 *   broken step -> stays inactive, plain message, refund
 *   unknown app -> rejected
 * Honesty: the Hinglish IndiaMART prompt against the REAL catalogue.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProductionCatalogue } from "../brain/catalogue.ts";
import { ANSWERS, LEAK, USER_A, harness, leadToSheetPlan } from "./fakes.test.ts";
import { looksLikeAutomationRequest, previewToChatText } from "./chat.ts";
import type { BrainPlan } from "../brain/plan-schema.ts";

const HINGLISH =
  "Jab IndiaMART se naya lead aaye, to usko ek minute ke andar WhatsApp par Hinglish mein personal reply bhejo. Agar reply na aaye to day 2, day 4 aur day 7 par follow-up bhejo. Reply aate hi follow-up band kar do aur owner ko WhatsApp par alert bhejo.";

test("FLOW: prompt -> preview -> answers -> confirm -> build -> test pass -> active", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  h.directory.add(USER_A, "sheets", "ops@shop.in");
  h.directory.add(USER_A, "email", "owner@shop.in");

  const preview = await h.service.preview({ userId: USER_A, prompt: "When a new lead comes in, save it to my sheet and email me" });
  assert.equal(h.fetchCalls(), 1, "planner called the (mocked) model once");
  assert.equal(preview.status, "needs_input");
  assert.equal(h.n8n.calls.length, 0, "preview builds nothing");

  const text = previewToChatText(preview);
  assert.match(text, /I will make this:/);
  assert.match(text, /Estimated cost: \d+ credits/);
  assert.match(text, /Which Google Sheet/);
  assert.doesNotMatch(text, LEAK);

  const result = await h.service.confirm({ userId: USER_A, draftId: preview.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(result.status, "active");
  assert.doesNotMatch(result.message, LEAK);
  const list = await h.service.list(USER_A);
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "active");
  assert.deepEqual(list[0].apps, ["Email", "Google Sheets"]);

  // Test payload was built from what the plan reads; marked as a test run.
  assert.equal((h.n8n.lastPayload as { automatecraft_test_run: boolean }).automatecraft_test_run, true);
  assert.deepEqual((h.n8n.lastPayload as { lead: unknown }).lead, { name: "Test Customer" });

  // Pause works afterwards.
  assert.equal((await h.service.pause(USER_A, list[0].id)).status, "paused");
});

test("FLOW: broken step -> stays inactive, plain message, refund", async () => {
  const h = harness({ plan: leadToSheetPlan() });
  h.directory.add(USER_A, "sheets", "ops@shop.in");
  h.directory.add(USER_A, "email", "owner@shop.in");
  const preview = await h.service.preview({ userId: USER_A, prompt: "save leads to sheet and email me" });
  h.n8n.failNode = "email_owner";
  const balance = await h.credits.balance(USER_A);
  const result = await h.service.confirm({ userId: USER_A, draftId: preview.draftId!, confirm: true, answers: ANSWERS });
  assert.equal(result.status, "failed_test");
  assert.match(result.message, /Email/);
  assert.match(result.message, /switched off/);
  assert.doesNotMatch(result.message, LEAK);
  assert.equal(await h.credits.balance(USER_A), balance);
  assert.equal([...h.n8n.workflows.values()][0].active, false);
});

test("FLOW: unknown-app prompt is rejected and nothing is drafted for building", async () => {
  const plan: BrainPlan = { ...leadToSheetPlan(), trigger: { kind: "webhook", integration: "tallyfoo", config: {} } };
  const h = harness({ plan });
  const preview = await h.service.preview({ userId: USER_A, prompt: "when tallyfoo gets an invoice, save it" });
  assert.equal(preview.status, "rejected");
  assert.match(preview.reason!, /Tallyfoo/);
  assert.equal(h.n8n.calls.length, 0);
});

/* ── Honesty ─────────────────────────────────────────────────────── */

test("HONESTY: IndiaMART connector and reply detection are not in the real catalogue", () => {
  const cat = buildProductionCatalogue();
  assert.ok(!cat.apps.some((a) => a.slug === "indiamart"), "if this fails, IndiaMART was added: switch the honesty test to a full end-to-end test");
  const ops = [...cat.builtins, ...cat.apps.flatMap((a) => a.operations)].map((o) => o.operation);
  assert.ok(!ops.some((o) => /reply|inbound|receive/.test(o)), "no step can detect an incoming WhatsApp reply");
});

test("HONESTY: Hinglish IndiaMART prompt is rejected against the real catalogue — model never even called", async () => {
  // Even a model that 'helpfully' returns a plan cannot get this through.
  const h = harness({ plan: leadToSheetPlan() });
  const p = await h.service.preview({ userId: USER_A, prompt: HINGLISH });
  assert.equal(p.status, "rejected");
  assert.match(p.reason!, /IndiaMART/);
  assert.doesNotMatch(p.reason!, LEAK);
  assert.equal(h.fetchCalls(), 0, "rejected before any model call");
  assert.equal(h.n8n.calls.length, 0);
});

test("HONESTY: same prompt with the model unavailable (fallback) is still rejected, not silently trimmed", async () => {
  const h = harness({ plan: null }); // model returns garbage -> fallback path
  const p = await h.service.preview({ userId: USER_A, prompt: HINGLISH });
  assert.equal(p.status, "rejected");
  assert.match(p.reason!, /IndiaMART/);
});

test("HONESTY: a reply-detection request the model reports as unsupported is stated honestly", async () => {
  const plan: BrainPlan = { ...leadToSheetPlan(), unsupportedRequests: ["stop follow-ups as soon as the customer replies on WhatsApp"] };
  const h = harness({ plan });
  const p = await h.service.preview({ userId: USER_A, prompt: "Jab form bhara jaye to WhatsApp bhejo, reply aate hi band karo" });
  assert.equal(p.status, "rejected");
  assert.match(p.reason!, /stop follow-ups/);
});

/* ── Chat glue ───────────────────────────────────────────────────── */

test("chat: Hinglish / Hindi / English automation requests are recognised; small talk is not", async () => {
  assert.equal(await looksLikeAutomationRequest("s", HINGLISH), true);
  assert.equal(await looksLikeAutomationRequest("s", "जब नया ऑर्डर आए तो मुझे अलर्ट भेजो"), true);
  assert.equal(await looksLikeAutomationRequest("s", "hello, how are you?"), false);
});

test("chat: preview text follows the plan language", () => {
  const text = previewToChatText({
    draftId: "d", status: "needs_input", language: "hinglish", preview: "Main yeh banaunga:\n1. x", steps: ["x"],
    costEstimate: 7, questions: [{ key: "k", question: "Number kya hai?" }], connections: [], unsupportedRequests: [], reason: null,
  });
  assert.match(text, /Andaazan kharcha: 7 credits/);
  assert.match(text, /Banane se pehle yeh bataiye:/);
});
