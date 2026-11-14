/**
 * Stage 1 tests. Gemini is MOCKED (injected fetch): these prove the plumbing —
 * request shape, key handling, parsing, catalogue gate, fallback — not model quality.
 *
 * Run: node --experimental-strip-types --import ./tests/loader/register.mjs --test src/lib/agent/brain/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProductionCatalogue, type AppCatalogue } from "./catalogue.ts";
import { GeminiPlanner, GeminiWording, type GeminiConfig } from "./gemini.ts";
import { DeterministicBrain } from "./fallback.ts";
import { createPlanner } from "./planner.ts";
import type { BrainPlan } from "./plan-schema.ts";

const KEY = "test-key-AIza-DO-NOT-LEAK";
const PROD = buildProductionCatalogue();

/** TEST FIXTURE ONLY: IndiaMART is NOT in the production catalogue. */
const WITH_INDIAMART: AppCatalogue = {
  ...PROD,
  apps: [...PROD.apps, { slug: "indiamart", label: "IndiaMART", triggerKinds: ["webhook"], operations: [] }],
};

const HINGLISH_PROMPT =
  "Jab IndiaMART se naya lead aaye, to usko ek minute ke andar WhatsApp par Hinglish mein personal reply bhejo. Agar reply na aaye to day 2, day 4 aur day 7 par follow-up bhejo. Reply aate hi follow-up band kar do aur owner ko WhatsApp par alert bhejo.";

/* ── helpers ─────────────────────────────────────────────────────── */

function geminiReply(obj: unknown): Response {
  return new Response(
    JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function cfg(fetchImpl: typeof fetch, over: Partial<GeminiConfig> = {}): GeminiConfig {
  return { apiKey: KEY, plannerModel: "test-planner-model", lightModel: "test-light-model", fetchImpl, ...over };
}

function plannerWith(fetchImpl: typeof fetch, over: Partial<GeminiConfig> = {}) {
  return createPlanner({ primary: new GeminiPlanner(cfg(fetchImpl, over)), fallback: new DeterministicBrain() });
}

type PlanStep = BrainPlan["steps"][number];
const send = (id: string, to: PlanStep["params"][string] | null, text: string, next: string[] = []): PlanStep => ({
  id, label: id.replace(/_/g, " "), kind: "notification", integration: "whatsapp", operation: "send_message",
  params: { ...(to ? { to } : {}), body: { source: "literal", value: text } }, next, errorPolicy: "retry",
});
const wait = (id: string, seconds: number, next: string[]): PlanStep => ({
  id, label: id, kind: "delay", integration: null, operation: "wait_seconds",
  params: { seconds: { source: "literal", value: String(seconds) } }, next, errorPolicy: "fail",
});
const check = (id: string, next: string[]): PlanStep => ({
  id, label: id, kind: "condition", integration: null, operation: "branch_on_exists",
  params: { input: { source: "trigger", ref: "lead.reply_text" } }, next, errorPolicy: "fail",
});
const lead = { source: "trigger", ref: "lead.phone" } as const;

function hinglishPlan(): BrainPlan {
  return {
    name: "IndiaMART lead follow-up",
    summary: "Naya IndiaMART lead aate hi WhatsApp par reply, phir day 2, 4, 7 par follow-up.",
    language: "hinglish",
    trigger: { kind: "webhook", integration: "indiamart", config: { event: "new_lead" } },
    steps: [
      send("reply_first", lead, "Namaste! Aapki enquiry mil gayi, hum abhi madad karte hain.", ["wait_day2"]),
      wait("wait_day2", 172800, ["check_day2"]),
      check("check_day2", ["alert_owner", "nudge_day2"]),
      send("nudge_day2", lead, "Kya aapko hamara jawab mila?", ["wait_day4"]),
      wait("wait_day4", 172800, ["check_day4"]),
      check("check_day4", ["alert_owner", "nudge_day4"]),
      send("nudge_day4", lead, "Ek baar phir yaad dila rahe hain.", ["wait_day7"]),
      wait("wait_day7", 259200, ["check_day7"]),
      check("check_day7", ["alert_owner", "nudge_day7"]),
      send("nudge_day7", lead, "Aakhri follow-up: baat karni ho to reply karein.", []),
      send("alert_owner", null, "Lead ne reply kiya hai, ab aap baat karein.", []),
    ],
    appsRequired: ["slack"], // wrong on purpose: code must ignore it
    missingFields: [
      { key: "whatsapp.owner_number", stepId: "alert_owner", param: "to", question: "Alert kis WhatsApp number par bhejna hai?" },
    ],
    unsupportedRequests: [],
  };
}

const banned = /(_|\{|\}|json|error code|stack|undefined|null|webhook|api key|http|\b[45]\d\d\b)/i;

/* ── Stage 1 required tests ──────────────────────────────────────── */

test("(a) Hinglish IndiaMART prompt returns a valid plan (IndiaMART in catalogue)", async () => {
  let seen: { url: string; headers: Record<string, string>; body: string } | null = null;
  const fetchMock: typeof fetch = async (url, init) => {
    seen = { url: String(url), headers: init!.headers as Record<string, string>, body: String(init!.body) };
    return geminiReply(hinglishPlan());
  };
  const result = await plannerWith(fetchMock).plan({ prompt: HINGLISH_PROMPT, catalogue: WITH_INDIAMART });

  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.source, "gemini");
  assert.equal(result.fallbackReason, undefined);
  assert.deepEqual(result.appsRequired, ["indiamart", "whatsapp"], "apps are derived by code, not taken from the model");
  assert.equal(result.plan.language, "hinglish");
  assert.equal(result.plan.missingFields.length, 1);

  // Request shape and key handling.
  assert.ok(seen);
  assert.match(seen!.url, /:generateContent$/);
  assert.ok(seen!.url.includes("test-planner-model"));
  assert.ok(!seen!.url.includes(KEY), "key must never appear in the URL");
  assert.equal(seen!.headers["x-goog-api-key"], KEY);
  const sent = JSON.parse(seen!.body);
  assert.ok(sent.contents[0].parts[0].text.includes("IndiaMART se naya lead"), "user prompt is sent as data");
  assert.ok(!sent.systemInstruction.parts[0].text.includes("IndiaMART se naya lead"), "user text never enters the system prompt");
  assert.ok(sent.systemInstruction.parts[0].text.includes("indiamart = IndiaMART"), "catalogue is in the system prompt");
  assert.equal(sent.generationConfig.responseMimeType, "application/json");
});

test("(a2) the same prompt against the PRODUCTION catalogue is rejected: IndiaMART is not buildable yet", async () => {
  const result = await plannerWith(async () => geminiReply(hinglishPlan())).plan({ prompt: HINGLISH_PROMPT, catalogue: PROD });
  assert.equal(result.status, "rejected");
  if (result.status !== "rejected") return;
  assert.match(result.reason, /IndiaMART/);
  assert.ok(result.problems.some((p) => p.code === "UNKNOWN_APP" && p.target === "indiamart"));
});

test("(b) a prompt for an app that does not exist is rejected with a plain reason", async () => {
  const plan = hinglishPlan();
  plan.trigger = { kind: "webhook", integration: "tallyfoo", config: {} };
  const result = await plannerWith(async () => geminiReply(plan)).plan({
    prompt: "Jab Tallyfoo mein naya invoice aaye to WhatsApp bhejo",
    catalogue: PROD,
  });
  assert.equal(result.status, "rejected");
  if (result.status !== "rejected") return;
  assert.match(result.reason, /Tallyfoo/);
  assert.match(result.reason, /WhatsApp/, "lists what is supported");
  assert.doesNotMatch(result.reason, banned);
  assert.equal(result.source, "gemini", "no silent fallback substitution");
});

/* ── Catalogue gate: code decides ────────────────────────────────── */

test("hallucinated operation is rejected", async () => {
  const plan = hinglishPlan();
  plan.steps[0] = { ...plan.steps[0], operation: "send_invoice" };
  const result = await plannerWith(async () => geminiReply(plan)).plan({ prompt: "x", catalogue: WITH_INDIAMART });
  assert.equal(result.status, "rejected");
  if (result.status === "rejected") {
    assert.ok(result.problems.some((p) => p.code === "UNKNOWN_OPERATION"));
    assert.doesNotMatch(result.reason, banned);
  }
});

test("model-reported unsupported request rejects the plan", async () => {
  const plan = hinglishPlan();
  plan.unsupportedRequests = ["stop follow-ups the moment the lead replies"];
  const result = await plannerWith(async () => geminiReply(plan)).plan({ prompt: "x", catalogue: WITH_INDIAMART });
  assert.equal(result.status, "rejected");
  if (result.status === "rejected") assert.match(result.reason, /stop follow-ups/);
});

test("required param that is neither filled nor asked about is rejected; asking makes it valid", async () => {
  const bad = hinglishPlan();
  bad.missingFields = [];
  const r1 = await plannerWith(async () => geminiReply(bad)).plan({ prompt: "x", catalogue: WITH_INDIAMART });
  assert.equal(r1.status, "rejected");
  if (r1.status === "rejected") assert.ok(r1.problems.some((p) => p.code === "MISSING_PARAM" && p.target === "alert_owner"));

  const r2 = await plannerWith(async () => geminiReply(hinglishPlan())).plan({ prompt: "x", catalogue: WITH_INDIAMART });
  assert.equal(r2.status, "ok");
});

test("loops and dangling steps are rejected", async () => {
  const loop = hinglishPlan();
  loop.steps[1] = wait("wait_day2", 172800, ["reply_first"]);
  const r1 = await plannerWith(async () => geminiReply(loop)).plan({ prompt: "x", catalogue: WITH_INDIAMART });
  assert.equal(r1.status, "rejected");

  const dangling = hinglishPlan();
  dangling.steps[0] = { ...dangling.steps[0], next: ["ghost_step"] };
  const r2 = await plannerWith(async () => geminiReply(dangling)).plan({ prompt: "x", catalogue: WITH_INDIAMART });
  assert.equal(r2.status, "rejected");
});

/* ── Fallback ────────────────────────────────────────────────────── */

const SIMPLE = "Send a WhatsApp message when a new form is submitted and save it to a sheet";

for (const [label, fetchMock, reason] of [
  ["HTTP 500", async () => new Response("boom", { status: 500 }), "http_error"],
  ["timeout", async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; }, "timeout"],
  ["network error", async () => { throw new TypeError("fetch failed"); }, "network"],
  ["not JSON", async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "sorry, here is prose" }] } }] }), { status: 200 }), "bad_output"],
  ["wrong schema", async () => geminiReply({ name: "x", extra: true }), "bad_output"],
  ["blocked", async () => new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }), { status: 200 }), "blocked"],
] as Array<[string, typeof fetch, string]>) {
  test(`falls back when Gemini fails: ${label}`, async () => {
    const result = await plannerWith(fetchMock).plan({ prompt: SIMPLE, catalogue: PROD });
    assert.equal(result.status, "ok", JSON.stringify(result.status === "rejected" ? result.problems : {}));
    if (result.status === "ok") {
      assert.equal(result.source, "fallback");
      assert.equal(result.fallbackReason, reason);
    }
  });
}

test("falls back when no key or no planner model is configured (and never calls the network)", async () => {
  let calls = 0;
  const spy: typeof fetch = async () => { calls++; return geminiReply({}); };
  for (const over of [{ apiKey: undefined }, { plannerModel: undefined }]) {
    const r = await plannerWith(spy, over).plan({ prompt: SIMPLE, catalogue: PROD });
    assert.equal(r.status, "ok");
    if (r.status === "ok") assert.equal(r.fallbackReason, "not_configured");
  }
  assert.equal(calls, 0);
});

/* ── Secrets and wording model ───────────────────────────────────── */

test("the API key never appears in errors or results", async () => {
  const r = await plannerWith(async () => new Response(`echo ${KEY}`, { status: 500 })).plan({ prompt: SIMPLE, catalogue: PROD });
  assert.ok(!JSON.stringify(r).includes(KEY));
});

test("wording model uses the light model and returns plain text", async () => {
  let url = "";
  const fetchMock: typeof fetch = async (u) => {
    url = String(u);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "  Aapka connection ruk gaya hai.  " }] } }] }), { status: 200 });
  };
  const w = new GeminiWording(cfg(fetchMock));
  assert.ok(w.isReady());
  assert.equal(await w.say({ instruction: "Make friendlier", text: "Connection lost", language: "hinglish" }), "Aapka connection ruk gaya hai.");
  assert.ok(url.includes("test-light-model") && !url.includes("test-planner-model"));
  assert.equal(new GeminiWording(cfg(fetchMock, { apiKey: undefined })).isReady(), false);
});
