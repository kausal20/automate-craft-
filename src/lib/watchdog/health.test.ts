import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAutomationHealth, type HealthInput } from "./health.ts";

const NOW = Date.parse("2026-06-10T12:00:00Z");
const H = 3600_000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const base = (over: Partial<HealthInput> = {}): HealthInput => ({
  automationId: "a1",
  automationStatus: "active",
  automationCreatedAt: iso(10 * 24 * H),
  integrationStatus: { whatsapp: "connected" },
  recentRuns: [{ status: "success", createdAt: iso(2 * H) }],
  now: NOW,
  ...over,
});

test("healthy automation is ok", () => {
  assert.equal(evaluateAutomationHealth(base()).status, "ok");
});

test("paused automation is skipped", () => {
  const v = evaluateAutomationHealth(base({ automationStatus: "paused", recentRuns: [] }));
  assert.equal(v.status, "ok");
  assert.equal(v.reason, null);
});

test("disconnected app is broken", () => {
  const v = evaluateAutomationHealth(base({ integrationStatus: { indiamart: "disconnected" } }));
  assert.equal(v.status, "broken");
  assert.equal(v.reason, "app_disconnected");
  assert.deepEqual(v.detail.apps, ["indiamart"]);
});

test("three failures in a row is broken", () => {
  const runs = [1, 2, 3].map((i) => ({ status: "error" as const, createdAt: iso(i * H) }));
  const v = evaluateAutomationHealth(base({ recentRuns: runs }));
  assert.equal(v.reason, "repeated_failures");
});

test("two failures then a success is not broken", () => {
  const v = evaluateAutomationHealth(base({
    recentRuns: [
      { status: "error", createdAt: iso(1 * H) },
      { status: "error", createdAt: iso(2 * H) },
      { status: "success", createdAt: iso(3 * H) },
    ],
  }));
  assert.equal(v.status, "ok");
});

test("running runs are ignored for failure streak", () => {
  const v = evaluateAutomationHealth(base({
    recentRuns: [
      { status: "running", createdAt: iso(0.5 * H) },
      { status: "error", createdAt: iso(1 * H) },
      { status: "error", createdAt: iso(2 * H) },
      { status: "error", createdAt: iso(3 * H) },
    ],
  }));
  assert.equal(v.reason, "repeated_failures");
});

test("no activity for 24h on active automation warns", () => {
  const v = evaluateAutomationHealth(base({ recentRuns: [{ status: "success", createdAt: iso(30 * H) }] }));
  assert.equal(v.status, "warn");
  assert.equal(v.reason, "no_activity_24h");
});

test("no runs ever on old automation warns", () => {
  assert.equal(evaluateAutomationHealth(base({ recentRuns: [] })).reason, "no_activity_24h");
});

test("brand-new automation with no runs is not flagged", () => {
  const v = evaluateAutomationHealth(base({ recentRuns: [], automationCreatedAt: iso(2 * H) }));
  assert.equal(v.status, "ok");
});
