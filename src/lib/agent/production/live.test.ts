/**
 * LIVE smoke test — real Gemini planner + real n8n at N8N_API_URL.
 * Gated: runs only with RUN_LIVE_AGENT_TESTS=1 and all of GEMINI_API_KEY,
 * GEMINI_PLANNER_MODEL, N8N_API_URL, N8N_API_KEY set. Otherwise it is SKIPPED
 * and reports BLOCKED-BY-ENV with the missing variable names. Never fakes a pass.
 *
 * Uses only no-login apps (webhook -> log) so no customer credentials are needed.
 * Storage and credits are in-memory; the n8n workflow it creates is deactivated at the end.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const REQUIRED = ["GEMINI_API_KEY", "GEMINI_PLANNER_MODEL", "N8N_API_URL", "N8N_API_KEY"] as const;
const enabled = process.env.RUN_LIVE_AGENT_TESTS === "1";
const missing = REQUIRED.filter((k) => !process.env[k]);
const skipReason = !enabled
  ? "BLOCKED-BY-ENV: RUN_LIVE_AGENT_TESTS is not 1"
  : missing.length > 0
    ? `BLOCKED-BY-ENV: missing ${missing.join(", ")}`
    : false;

if (skipReason) console.log(`[live smoke] ${skipReason}`);

test("LIVE: preview -> confirm -> build -> test passes -> active -> pause", { skip: skipReason, timeout: 180_000 }, async () => {
  const { buildProductionCatalogue } = await import("../brain/catalogue.ts");
  const { DeterministicBrain } = await import("../brain/fallback.ts");
  const { GeminiPlanner } = await import("../brain/gemini.ts");
  const { createPlanner } = await import("../brain/planner.ts");
  const { MemoryActivityLog, MemoryAutomationRepo, MemoryCreditLedger, MemoryDraftRepo } = await import("./memory.ts");
  const { AgentService } = await import("./service.ts");
  const { liveN8nGateway } = await import("./live.ts");
  const { realPipeline } = await import("./fakes.test.ts");

  const user = "00000000-0000-4000-8000-0000000011ee";
  let seq = 0;
  const service = new AgentService({
    planner: createPlanner({
      primary: new GeminiPlanner({
        apiKey: process.env.GEMINI_API_KEY,
        plannerModel: process.env.GEMINI_PLANNER_MODEL,
        lightModel: process.env.GEMINI_LIGHT_MODEL || "gemini-3.1-flash-lite",
      }),
      fallback: new DeterministicBrain(),
    }),
    catalogue: buildProductionCatalogue,
    drafts: new MemoryDraftRepo(),
    automations: new MemoryAutomationRepo(),
    activity: new MemoryActivityLog(),
    credits: new MemoryCreditLedger({ [user]: 1000 }),
    directory: { listAccounts: async () => [] },
    binder: { bind: async () => ({ ok: true as const, attachments: {} }) },
    n8n: liveN8nGateway,
    pipeline: realPipeline,
    newId: () => `00000000-0000-4000-a000-${String(++seq).padStart(12, "0")}`,
  });

  const preview = await service.preview({
    userId: user,
    prompt: "When my webhook receives an event, write a line 'Event received' to the activity log. Use no other apps.",
  });
  assert.notEqual(preview.status, "rejected", preview.reason ?? "");
  assert.notEqual(preview.status, "needs_connection");

  const answers: Record<string, string> = {};
  for (const q of preview.questions) answers[q.key] = "Event received";

  const result = await service.confirm({ userId: user, draftId: preview.draftId!, confirm: true, answers });
  assert.equal(result.status, "active", JSON.stringify(result));
  if (result.status !== "active") return;
  const paused = await service.pause(user, result.automationId);
  assert.equal(paused.status, "paused");
});
