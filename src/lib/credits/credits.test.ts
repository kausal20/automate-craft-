/**
 * Credit system tests — real credit service on the REAL local ledger
 * (local-store in a throwaway folder). No live services.
 *
 * Run with the suite:
 *   node --experimental-transform-types --import ./tests/loader/register.mjs --test "src/lib/**\/*.test.ts"
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The local store writes to <cwd>/data — point it at a temp folder BEFORE loading it.
const SANDBOX = mkdtempSync(path.join(tmpdir(), "ac-credits-"));
process.chdir(SANDBOX);
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

type Mods = {
  credits: typeof import("./index.ts");
  guard: typeof import("./run-guard.ts");
  store: typeof import("../credit-store.ts");
  local: typeof import("../local-store.ts");
  reserver: typeof import("../execution/credits/reserver.ts");
  plans: typeof import("../plans.ts");
};
let m: Mods;

before(async () => {
  m = {
    credits: await import("./index.ts"),
    guard: await import("./run-guard.ts"),
    store: await import("../credit-store.ts"),
    local: await import("../local-store.ts"),
    reserver: await import("../execution/credits/reserver.ts"),
    plans: await import("../plans.ts"),
  };
});

let seq = 0;
const newUser = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

async function purses(userId: string) {
  const db = await m.local.readLocalDatabase();
  const u = db.users.find((x) => x.id === userId)!;
  return { plan: u.planCredits, extra: u.extraCredits };
}
async function rows(userId: string) {
  return (await m.local.readLocalDatabase()).creditTransactions.filter((t) => t.userId === userId);
}

/* ── Idempotency ─────────────────────────────────────────────────── */

test("same reference_id deduct called twice = charged once", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  await svc.grant({ userId: u, amount: 100, kind: "purchase", referenceId: `p:${u}`, description: "top-up" });
  const a = await svc.reserve({ userId: u, amount: 30, referenceId: "run-1-" + u, description: "run" });
  const b = await svc.reserve({ userId: u, amount: 30, referenceId: "run-1-" + u, description: "run" });
  assert.deepEqual(a, { ok: true, charged: 30, alreadyReserved: false });
  assert.deepEqual(b, { ok: true, charged: 30, alreadyReserved: true });
  assert.equal(await svc.balance(u), 10 + 100 - 30);
  assert.equal((await rows(u)).filter((r) => r.type === "deduct").length, 1);
});

test("duplicate refund for the same reference refunds once", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  await svc.reserve({ userId: u, amount: 4, referenceId: "r-" + u, description: "x" });
  const r1 = await svc.refund({ userId: u, referenceId: "r-" + u, description: "back" });
  const r2 = await svc.refund({ userId: u, referenceId: "r-" + u, description: "back" });
  assert.deepEqual(r1, { ok: true, refunded: 4, alreadyRefunded: false });
  assert.deepEqual(r2, { ok: true, refunded: 0, alreadyRefunded: true });
  assert.equal(await svc.balance(u), 10);
});

test("insufficient credits: nothing charged, no ledger row, plain blocked note", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  const r = await svc.reserve({ userId: u, amount: 999, referenceId: "big-" + u, description: "huge run" });
  assert.deepEqual(r, { ok: false, reason: "insufficient", balance: 10 });
  assert.equal((await rows(u)).filter((t) => t.type === "deduct").length, 0);
  // A later real charge with the same reference is NOT blocked by the failed attempt.
  await svc.grant({ userId: u, amount: 1000, kind: "purchase", referenceId: "topup-" + u, description: "top-up" });
  assert.equal((await svc.reserve({ userId: u, amount: 999, referenceId: "big-" + u, description: "huge run" })).ok, true);
});

/* ── Grants ──────────────────────────────────────────────────────── */

test("subscription grant called twice in the same month = granted once; next month grants again", async () => {
  const u = newUser();
  const nov = new Date("2026-11-15T10:00:00Z");
  assert.equal(await m.store.grantSubscriptionCredits(u, "plan_plus", nov), true);
  assert.equal(await m.store.grantSubscriptionCredits(u, "plan_plus", nov), true);
  assert.deepEqual(await purses(u), { plan: 10 + 30000, extra: 0 });
  const subs = (await rows(u)).filter((r) => r.type === "subscription");
  assert.equal(subs.length, 1);
  assert.equal(subs[0].referenceId, `subscription:${u}:plan_plus:2026-11`);
  const db = await m.local.readLocalDatabase();
  assert.equal(db.subscriptions.filter((s) => s.userId === u).length, 1, "no second subscription row either");

  await m.store.grantSubscriptionCredits(u, "plan_plus", new Date("2026-12-02T10:00:00Z"));
  assert.equal((await rows(u)).filter((r) => r.type === "subscription").length, 2);
});

test("yearly plan grants 12x the monthly amount from the one plans config", async () => {
  const u = newUser();
  await m.store.grantSubscriptionCredits(u, "plan_pro_yearly", new Date("2026-11-01T00:00:00Z"));
  assert.deepEqual(await purses(u), { plan: 10 + 60000 * 12, extra: 0 });
  assert.equal(await m.store.grantSubscriptionCredits(u, "plan_unknown"), false);
});

test("plans config is the single source: Starter 15000, Plus 30000, Pro 60000; local plans read from it", async () => {
  assert.equal(m.plans.planGrant("plan_starter")!.credits, 15000);
  assert.equal(m.plans.planGrant("plan_plus")!.credits, 30000);
  assert.equal(m.plans.planGrant("plan_pro")!.credits, 60000);
  assert.equal(m.plans.planGrant("plan_starter_yearly")!.credits, 180000);
  const db = await m.local.readLocalDatabase();
  assert.equal(db.plans.find((p) => p.id === "plan_plus")!.credits, 30000);
  assert.equal(db.plans.find((p) => p.id === "plan_plus")!.price, "₹2000", "prices untouched");
  const subscribe = readFileSync(fileURLToPath(new URL("../../app/api/subscribe/route.ts", import.meta.url)), "utf8");
  assert.doesNotMatch(subscribe, /credits:\s*\d/, "no duplicated plan numbers in the subscribe route");
});

/* ── Purses ──────────────────────────────────────────────────────── */

test("mixed-purse deduct (part plan, part extra) then refund = both purses restored exactly", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  await svc.grant({ userId: u, amount: 100, kind: "purchase", referenceId: "buy-" + u, description: "top-up" });
  assert.deepEqual(await purses(u), { plan: 10, extra: 100 });
  await svc.reserve({ userId: u, amount: 30, referenceId: "mix-" + u, description: "run" });
  assert.deepEqual(await purses(u), { plan: 0, extra: 80 });
  const deduct = (await rows(u)).find((r) => r.type === "deduct")!;
  assert.equal(deduct.metadata.plan_part, 10);
  assert.equal(deduct.metadata.extra_part, 20);
  await svc.refund({ userId: u, referenceId: "mix-" + u, description: "back" });
  assert.deepEqual(await purses(u), { plan: 10, extra: 100 });
});

test("purchases go to the extra purse; subscriptions to the plan purse", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  await svc.grant({ userId: u, amount: 50, kind: "purchase", referenceId: "pp-" + u, description: "buy" });
  await svc.grant({ userId: u, amount: 70, kind: "subscription", referenceId: "ss-" + u, description: "sub" });
  assert.deepEqual(await purses(u), { plan: 80, extra: 50 });
});

/* ── Runs ────────────────────────────────────────────────────────── */

test("legacy path: a failed run refunds in full; a thrown run refunds in full", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  const failed = await m.guard.chargeForRun({
    userId: u, amount: 6, referenceId: "legacy-a-" + u, description: "Executed Automation", automationName: "Leads",
    run: async () => ({ status: "error" }), succeeded: (r) => r.status === "success",
  });
  assert.equal(failed.ok, true);
  assert.equal(await svc.balance(u), 10);

  await assert.rejects(m.guard.chargeForRun({
    userId: u, amount: 6, referenceId: "legacy-b-" + u, description: "Executed Automation", automationName: "Leads",
    run: async () => { throw new Error("boom"); }, succeeded: () => true,
  }));
  assert.equal(await svc.balance(u), 10);

  const ok = await m.guard.chargeForRun({
    userId: u, amount: 6, referenceId: "legacy-c-" + u, description: "Executed Automation", automationName: "Leads",
    run: async () => ({ status: "success" }), succeeded: (r) => r.status === "success",
  });
  assert.equal(ok.ok && ok.charged, 6);
  assert.equal(await svc.balance(u), 4);
});

test("legacy path: insufficient credits never start the run and leave a plain note", async () => {
  const u = newUser();
  let ran = false;
  const r = await m.guard.chargeForRun({
    userId: u, amount: 500, referenceId: "legacy-d-" + u, description: "Executed Automation", automationName: "Daily report",
    run: async () => { ran = true; return {}; }, succeeded: () => true,
  });
  assert.deepEqual(r, { ok: false, reason: "insufficient", balance: 10 });
  assert.equal(ran, false);
  const logs = await m.store.listUsageLogsForUser(u);
  assert.ok(logs.some((l) => /“Daily report” stopped because you ran out of credits/.test(l.action)));
});

test("orchestrator path: failed run keeps completed steps and refunds the rest; unknown steps = full refund", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  await svc.grant({ userId: u, amount: 90, kind: "purchase", referenceId: "o-buy-" + u, description: "buy" });

  await m.reserver.reserveRunCredits({ userId: u, amount: 10, referenceId: "run-a-" + u, perStep: { a: 2, b: 3, c: 5 } });
  assert.equal(await svc.balance(u), 90);
  const s1 = await m.reserver.settleRunCredits({ referenceId: "run-a-" + u, succeeded: false, completedStepIds: ["a", "b"] });
  assert.deepEqual(s1, { kept: 5, refunded: 5 });
  assert.equal(await svc.balance(u), 95);

  await m.reserver.reserveRunCredits({ userId: u, amount: 10, referenceId: "run-b-" + u, perStep: { a: 2, b: 3, c: 5 } });
  const s2 = await m.reserver.settleRunCredits({ referenceId: "run-b-" + u, succeeded: false, completedStepIds: null });
  assert.deepEqual(s2, { kept: 0, refunded: 10 });
  assert.equal(await svc.balance(u), 95);

  await m.reserver.reserveRunCredits({ userId: u, amount: 10, referenceId: "run-c-" + u, perStep: { a: 10 } });
  const s3 = await m.reserver.settleRunCredits({ referenceId: "run-c-" + u, succeeded: true });
  assert.deepEqual(s3, { kept: 10, refunded: 0 });
  assert.equal(await svc.balance(u), 85);

  // Settling twice changes nothing.
  await m.reserver.settleRunCredits({ referenceId: "run-a-" + u, succeeded: false, completedStepIds: ["a", "b"] });
  assert.equal(await svc.balance(u), 85);
});

test("partial refund returns the extra purse first (charged last), then plan", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  await svc.grant({ userId: u, amount: 20, kind: "purchase", referenceId: "pr-" + u, description: "buy" });
  await svc.reserve({ userId: u, amount: 25, referenceId: "pr-run-" + u, description: "run" }); // plan 10, extra 15
  await svc.settle({ userId: u, referenceId: "pr-run-" + u, completedAmount: 5 }); // refund 20: 15 extra + 5 plan
  assert.deepEqual(await purses(u), { plan: 5, extra: 20 });
});

/* ── Local-mode parity ───────────────────────────────────────────── */

test("local mode: refunds persist and every transaction tracks balanceAfter", async () => {
  const svc = m.credits.getCreditService();
  const u = newUser();
  await svc.reserve({ userId: u, amount: 3, referenceId: "lp-" + u, description: "run" });
  await svc.refund({ userId: u, referenceId: "lp-" + u, description: "back" });
  const tx = await m.store.listCreditTransactions(u);
  assert.deepEqual(tx.map((t) => [t.type, t.balanceAfter]), [["refund", 10], ["deduct", 7], ["grant", 10]]);
  assert.equal((await m.store.getUserCredits(u)).totalCredits, 10);
});

/* ── Credit state ────────────────────────────────────────────────── */

test("creditState: ok above 20%, low at/below 20% or under 100, empty at 0", () => {
  const { creditState, usagePercent } = m.credits;
  assert.equal(creditState(3001, 15000), "ok");
  assert.equal(creditState(3000, 15000), "low");
  assert.equal(creditState(150, 15000), "low");
  assert.equal(creditState(99, 0), "low");
  assert.equal(creditState(500, 0), "ok");
  assert.equal(creditState(0, 15000), "empty");
  assert.equal(usagePercent(7500, 15000), 50);
  assert.equal(usagePercent(5, 0), 0);
});

test("credits read model includes plan, monthly grant and usage", async () => {
  const u = newUser();
  await m.store.grantSubscriptionCredits(u, "plan_starter", new Date());
  const c = await m.store.getUserCredits(u);
  assert.equal(c.planId, "plan_starter");
  assert.equal(c.monthlyGrant, 15000);
});

/* ── Chat fee ────────────────────────────────────────────────────── */

test("chat fee: agent messages are free; legacy chat keeps 5 / 10; free mode is env-only and off by default", () => {
  const { chatChargeFor, chatFreeTestMode } = m.guard;
  assert.equal(chatChargeFor({ isAgentMessage: true, ultraThinking: true, freeTestMode: false }), 0);
  assert.equal(chatChargeFor({ isAgentMessage: false, ultraThinking: false, freeTestMode: false }), 5);
  assert.equal(chatChargeFor({ isAgentMessage: false, ultraThinking: true, freeTestMode: false }), 10);
  assert.equal(chatFreeTestMode({} as NodeJS.ProcessEnv), false);
  assert.equal(chatFreeTestMode({ CHAT_FREE_TEST_MODE: "true", NODE_ENV: "production" } as NodeJS.ProcessEnv), false);
  assert.equal(chatFreeTestMode({ CHAT_FREE_TEST_MODE: "true", NODE_ENV: "development" } as NodeJS.ProcessEnv), true);
});

/* ── Static guarantees ───────────────────────────────────────────── */

const SRC = fileURLToPath(new URL("../../", import.meta.url));
const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");

test("no direct deductCredits / buyCredits callers remain; reserver has no post-hoc tagging", () => {
  const files = [
    "app/api/chat/route.ts", "app/api/generate-automation/route.ts", "app/api/use-build-credit/route.ts",
    "app/api/use-run-credit/route.ts", "app/api/run-automation/route.ts", "app/api/run-workflow/route.ts",
    "app/api/webhook/[id]/route.ts", "app/api/subscribe/route.ts", "app/api/buy-credits/route.ts",
    "lib/execution/credits/reserver.ts", "lib/workflow-credits.ts", "lib/agent/production/live.ts", "lib/credit-store.ts",
  ];
  for (const f of files) {
    const src = read(f);
    assert.doesNotMatch(src, /\bdeductCredits\(|\bbuyCredits\(/, f);
  }
  assert.doesNotMatch(read("lib/execution/credits/reserver.ts"), /\.is\("reference_id", null\)/);
  assert.doesNotMatch(read("lib/workflow-credits.ts"), /type: "usage"|credit_transactions/);
  assert.match(read("app/api/chat/route.ts"), /chatChargeFor\(\{ isAgentMessage/);
});

test("migration: reference_id inside the RPCs, unique (reference_id, type), no 'usage' resurrection", () => {
  const sql = readFileSync(path.join(SRC, "../supabase/migrations/20260614_credit_ledger.sql"), "utf8");
  assert.match(sql, /create unique index if not exists credit_transactions_reference_type_uniq\s+on public\.credit_transactions \(reference_id, type\)\s+where reference_id is not null/);
  assert.match(sql, /p_reference_id text default null/);
  assert.match(sql, /'plan_part', v_plan_part, 'extra_part', v_extra_part/);
  assert.match(sql, /exception when unique_violation then/);
  assert.doesNotMatch(sql, /'usage'/);
  assert.match(sql, /revoke execute on function public\.deduct_credits_atomic/);
});
