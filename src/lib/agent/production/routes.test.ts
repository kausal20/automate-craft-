/**
 * Endpoint guard: every agent route resolves the user from the session
 * (withUser) and never reads a user id from the request. Together with the
 * service-level isolation tests this covers "user B cannot reach user A's
 * automations through any endpoint".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../app/api/agent/", import.meta.url));

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? routeFiles(p) : name === "route.ts" ? [p] : [];
  });
}

const files = routeFiles(ROOT);

test("all nine agent endpoints exist", () => {
  assert.equal(files.length, 9);
});

for (const file of files) {
  const rel = path.relative(ROOT, file);
  test(`endpoint ${rel}: user comes from the session only`, () => {
    const src = readFileSync(file, "utf8");
    assert.match(src, /withUser\(/, "must go through withUser (session auth + error mapping)");
    assert.doesNotMatch(src, /body\.(userId|user_id|ownerId)|searchParams\.get\(["']user/i, "must never trust a user id from the request");
    assert.doesNotMatch(src, /createSupabaseAdminClient|n8nClient/, "routes talk to the service, never straight to the database or n8n");
  });
}

test("chat and generate-automation use the planner-backed agent, not the old orchestrators", () => {
  const api = fileURLToPath(new URL("../../../app/api/", import.meta.url));
  const chat = readFileSync(path.join(api, "chat/route.ts"), "utf8");
  const gen = readFileSync(path.join(api, "generate-automation/route.ts"), "utf8");
  for (const src of [chat, gen]) {
    assert.match(src, /getAgentService\(\)/);
    assert.match(src, /\.preview\(\{/);
    assert.doesNotMatch(src, /defaultAgentOrchestrator|generateWorkflow\(/);
  }
});
