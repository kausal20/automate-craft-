/**
 * One full agent journey (ask in chat -> preview -> confirm) on the REAL
 * credit service + local ledger: exactly one deduction, at confirm.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.chdir(mkdtempSync(path.join(tmpdir(), "ac-journey-")));
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

let mods: {
  credits: typeof import("../../credits/index.ts");
  guard: typeof import("../../credits/run-guard.ts");
  local: typeof import("../../local-store.ts");
  ledger: typeof import("./credits.ts");
  fakes: typeof import("./fakes.test.ts");
  chat: typeof import("./chat.ts");
};

before(async () => {
  mods = {
    credits: await import("../../credits/index.ts"),
    guard: await import("../../credits/run-guard.ts"),
    local: await import("../../local-store.ts"),
    ledger: await import("./credits.ts"),
    fakes: await import("./fakes.test.ts"),
    chat: await import("./chat.ts"),
  };
});

test("agent journey: chat ask is free, preview is free, confirm deducts exactly once", async () => {
  const { credits, guard, local, ledger, fakes, chat } = mods;
  const service = credits.getCreditService();
  const user = fakes.USER_A;
  await service.grant({ userId: user, amount: 100, kind: "purchase", referenceId: "journey-topup", description: "top-up" });
  const start = await service.balance(user);

  // 1. The chat message is an automation request -> no chat fee.
  const prompt = "Jab bhi webhook par event aaye, use activity log mein likh do";
  const isAgentMessage = await chat.looksLikeAutomationRequest("s", prompt);
  assert.equal(isAgentMessage, true);
  assert.equal(guard.chatChargeFor({ isAgentMessage, ultraThinking: false, freeTestMode: false }), 0);

  // 2. Preview -> still nothing charged.
  const h = fakes.harness({ plan: fakes.noAuthPlan(), ledger: ledger.creditLedgerFrom(service) });
  const preview = await h.service.preview({ userId: user, prompt });
  assert.equal(preview.status, "ready");
  assert.equal(await service.balance(user), start);

  // 3. Confirm -> one deduction for the build, nothing else.
  const result = await h.service.confirm({ userId: user, draftId: preview.draftId!, confirm: true });
  assert.equal(result.status, "active");
  // Confirming again (idempotent) charges nothing more.
  await h.service.confirm({ userId: user, draftId: preview.draftId!, confirm: true });

  const deducts = (await local.readLocalDatabase()).creditTransactions.filter((t) => t.userId === user && t.type === "deduct");
  assert.equal(deducts.length, 1);
  assert.match(deducts[0].referenceId!, /^agent-build:/);
  assert.equal(await service.balance(user), start - preview.costEstimate);
});

test("agent journey: a failed test run refunds the build to the same purses", async () => {
  const { credits, local, ledger, fakes } = mods;
  const service = credits.getCreditService();
  const user = fakes.USER_B;
  const h = fakes.harness({ plan: fakes.leadToSheetPlan(), ledger: ledger.creditLedgerFrom(service) });
  await service.grant({ userId: user, amount: 50, kind: "purchase", referenceId: "journey-b-topup", description: "top-up" });
  h.directory.add(user, "google", "ops@shop.in");
  h.directory.add(user, "email", "owner@shop.in");
  const before_ = (await local.readLocalDatabase()).users.find((u) => u.id === user)!;
  const plan0 = before_.planCredits;
  const extra0 = before_.extraCredits;

  const preview = await h.service.preview({ userId: user, prompt: "save leads and email me" });
  h.n8n.failNode = "save_lead";
  const result = await h.service.confirm({ userId: user, draftId: preview.draftId!, confirm: true, answers: fakes.ANSWERS });
  assert.equal(result.status, "failed_test");

  const after = (await local.readLocalDatabase()).users.find((u) => u.id === user)!;
  assert.deepEqual([after.planCredits, after.extraCredits], [plan0, extra0]);
});
