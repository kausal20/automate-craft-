/**
 * Connected Apps page logic (connect-client.ts), with a mocked fetch.
 * The React page itself has no component-test setup in this repo (no jsdom /
 * testing-library), so the page's decisions are covered here at the logic
 * level the page calls, plus static checks on the page source.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadIntegrations, plainConnectError, requestConnect, requestDisconnect } from "./connect-client.ts";

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

test("connect: an authorizationUrl response means a full redirect to the provider", async () => {
  const m = mockFetch(() => Response.json({ kind: "oauth", authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?client_id=x" }));
  const out = await requestConnect("google", "Google Workspace", { fetchImpl: m.fetchImpl });
  assert.deepEqual(out, { kind: "redirect", url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=x" });
  assert.equal(m.calls[0].url, "/api/connections/google/connect");
  assert.equal(m.calls[0].init?.method, "POST");
});

test("connect: the 503 'not configured' answer is shown in plain words and nothing is marked connected", async () => {
  const m = mockFetch(() => Response.json({ error: 'Provider "slack" is not configured. Add its env vars.' }, { status: 503 }));
  const out = await requestConnect("slack", "Slack", { fetchImpl: m.fetchImpl });
  assert.equal(out.kind, "error");
  if (out.kind === "error") {
    assert.match(out.message, /Slack sign-in isn't set up on our side yet/);
    assert.match(out.message, /Nothing was connected/);
  }
});

test("connect: only a real server success connects an API-key app; a weird or failed answer never does", async () => {
  const ok = mockFetch(() => Response.json({ kind: "api_key", connection: { id: "c1", status: "connected" } }));
  assert.deepEqual(await requestConnect("whatsapp", "WhatsApp", { fetchImpl: ok.fetchImpl, credentialPayload: { accessToken: "t", businessAccountId: "b" } }), { kind: "connected" });
  assert.equal(JSON.parse(String(ok.calls[0].init?.body)).credentialPayload.accessToken, "t");

  for (const res of [
    () => Response.json({}),
    () => Response.json({ kind: "oauth", authorizationUrl: "javascript:alert(1)" }),
    () => Response.json({ error: "Please fill in: businessAccountId." }, { status: 400 }),
  ]) {
    const m = mockFetch(res);
    assert.equal((await requestConnect("whatsapp", "WhatsApp", { fetchImpl: m.fetchImpl })).kind, "error");
  }
  const down = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
  assert.equal((await requestConnect("slack", "Slack", { fetchImpl: down })).kind, "error");
});

test("connect: unknown apps get an honest 'can't connect yet'", () => {
  assert.match(plainConnectError("OpenAI", 404, 'No OAuth provider registered for "openai".'), /can't connect to OpenAI yet/);
});

test("load: a failed load marks NO app connected and reports the failure", async () => {
  for (const res of [() => new Response("boom", { status: 500 }), () => Response.json({ nope: true })]) {
    const m = mockFetch(res);
    const out = await loadIntegrations(["slack", "github"], { fetchImpl: m.fetchImpl });
    assert.equal(out.ok, false);
    assert.ok(!("entries" in out));
  }
  const thrown = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
  assert.equal((await loadIntegrations(["slack"], { fetchImpl: thrown })).ok, false);
});

test("load: statuses come from the server; catalogue-only apps are always not connected", async () => {
  const m = mockFetch(() => Response.json({ integrations: [
    { integration: "google", status: "connected", updatedAt: "2026-11-22T00:00:00Z" },
    { integration: "slack", status: "error", updatedAt: null },
    { integration: "hubspot", status: "weird", updatedAt: null },
  ] }));
  const out = await loadIntegrations(["google", "slack", "openai", "aws_s3"], { fetchImpl: m.fetchImpl });
  assert.equal(out.ok, true);
  if (out.ok) {
    const byId = Object.fromEntries(out.entries.map((e) => [e.integration, e.status]));
    assert.deepEqual(byId, { google: "connected", slack: "error", hubspot: "disconnected", openai: "disconnected", aws_s3: "disconnected" });
  }
});

test("disconnect: calls DELETE and reports a failure plainly", async () => {
  const ok = mockFetch(() => Response.json({ revoked: true }));
  assert.deepEqual(await requestDisconnect("slack", "Slack", { fetchImpl: ok.fetchImpl }), { ok: true });
  assert.equal(ok.calls[0].url, "/api/connections/slack");
  assert.equal(ok.calls[0].init?.method, "DELETE");
  const bad = mockFetch(() => Response.json({ error: "nope" }, { status: 500 }));
  const out = await requestDisconnect("slack", "Slack", { fetchImpl: bad.fetchImpl });
  assert.equal(out.ok, false);
});

test("page: no simulated connect, no fake fallback, its own scroll area", () => {
  const page = readFileSync(fileURLToPath(new URL("../../app/dashboard/apps/page.tsx", import.meta.url)), "utf8");
  assert.doesNotMatch(page, /Simulate OAuth|setTimeout\(r, 1000\)/, "no simulated connect delay");
  assert.doesNotMatch(page, /id === "slack" \|\| id === "github"/, "no fake connected fallback");
  assert.doesNotMatch(page, /status: "connected"/, "the page never sets connected itself");
  assert.match(page, /requestConnect\(/);
  assert.match(page, /window\.location\.href = out\.url/);
  assert.match(page, /requestDisconnect\(/);
  assert.match(page, /h-full w-full overflow-y-auto/);
  const callback = readFileSync(fileURLToPath(new URL("../../app/api/oauth/callback/[provider]/route.ts", import.meta.url)), "utf8");
  assert.match(callback, /\/dashboard\/apps/);
});
