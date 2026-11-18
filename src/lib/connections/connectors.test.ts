/**
 * Part A — store connectors. Real OAuth service, vault, connections repo and
 * n8n credential sync in LOCAL mode (temp folder); Google's token endpoint and
 * the n8n API are mocked through global fetch. No live provider.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(mkdtempSync(path.join(tmpdir(), "ac-connectors-")));
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.GOOGLE_OAUTH_CLIENT_ID = "test-google-client";
process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-google-secret";
process.env.N8N_API_URL = "https://n8n.test.invalid/api/v1";
process.env.N8N_API_KEY = "test-n8n-key";

const USER = "00000000-0000-4000-8000-0000000000c1";

/* ── fetch mock: Google token endpoint + n8n credentials API ──────── */

const n8nCalls: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
let tokenMode: "ok" | "fail" = "ok";
let tokenSeq = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    if (tokenMode === "fail") return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    tokenSeq += 1;
    return Response.json({ access_token: `access-${tokenSeq}`, refresh_token: "refresh-1", expires_in: 3600, token_type: "Bearer", email: "owner@shop.in" });
  }
  if (url.startsWith("https://n8n.test.invalid/api/v1/credentials")) {
    const p = url.replace("https://n8n.test.invalid/api/v1", "");
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    n8nCalls.push({ method: init?.method ?? "GET", path: p, body });
    const id = p === "/credentials" ? `n8n-cred-${n8nCalls.filter((c) => c.method === "POST").length}` : p.split("/").pop();
    return Response.json({ id, name: body.name, type: body.type });
  }
  if (url.startsWith("https://www.googleapis.com/oauth2/v3/userinfo")) return Response.json({ email: "owner@shop.in" });
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

type M = {
  oauth: typeof import("../oauth/index.ts");
  providers: typeof import("../oauth/providers/index.ts");
  conns: typeof import("./index.ts");
  vault: typeof import("../credentials/index.ts");
  sync: typeof import("../adapters/n8n/credentials/sync-service.ts");
  healthLive: typeof import("./health-live.ts");
  health: typeof import("./health.ts");
  store: typeof import("./store.ts");
  registry: typeof import("./registry.ts");
  apps: typeof import("./connected-apps.ts");
  local: typeof import("../local-store.ts");
  mapper: typeof import("../adapters/n8n/compiler/step-mapper.ts");
  workflow: typeof import("../workflow/index.ts");
  planner: typeof import("../agent/brain/planner.ts");
  catalogue: typeof import("../agent/brain/catalogue.ts");
};
let m: M;

before(async () => {
  m = {
    oauth: await import("../oauth/index.ts"),
    providers: await import("../oauth/providers/index.ts"),
    conns: await import("./index.ts"),
    vault: await import("../credentials/index.ts"),
    sync: await import("../adapters/n8n/credentials/sync-service.ts"),
    healthLive: await import("./health-live.ts"),
    health: await import("./health.ts"),
    store: await import("./store.ts"),
    registry: await import("./registry.ts"),
    apps: await import("./connected-apps.ts"),
    local: await import("../local-store.ts"),
    mapper: await import("../adapters/n8n/compiler/step-mapper.ts"),
    workflow: await import("../workflow/index.ts"),
    planner: await import("../agent/brain/planner.ts"),
    catalogue: await import("../agent/brain/catalogue.ts"),
  };
});

async function connectGoogle(slug: string) {
  const begin = await m.oauth.beginConnection({ userId: USER, providerSlug: slug });
  const url = new URL(begin.authorizationUrl);
  await m.oauth.completeConnection({ userId: USER, providerSlug: slug, code: "code", state: begin.state, rawQuery: {} });
  return url;
}

/* ── Google scopes ───────────────────────────────────────────────── */

test("Google scopes: Gmail read+send and Calendar read+create are requested; full Gmail access is NOT", async () => {
  const scopes = (await m.oauth.beginConnection({ userId: USER, providerSlug: "google" }).then((b) => new URL(b.authorizationUrl))).searchParams.get("scope")!.split(" ");
  for (const s of [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/forms.responses.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
  ]) assert.ok(scopes.includes(s), s);
  assert.ok(!scopes.includes("https://mail.google.com/"), "no full Gmail access");
  assert.ok(!scopes.some((s) => /gmail\.(modify|compose|insert|settings)/.test(s)));
  assert.ok(!scopes.includes("https://www.googleapis.com/auth/calendar"), "no full Calendar access");

  // And nowhere in the connections / OAuth code.
  const src = fileURLToPath(new URL("../", import.meta.url));
  const files = ["connections", "oauth"].flatMap((d) => walk(path.join(src, d))).filter((f) => !f.endsWith(".test.ts"));
  for (const f of files) assert.doesNotMatch(readFileSync(f, "utf8"), /https:\/\/mail\.google\.com\//, f);
});

/* ── One connection ──────────────────────────────────────────────── */

test("one connection: adding Gmail to an existing Google connection keeps ONE row, ONE vault credential, ONE n8n credential", async () => {
  // Existing Google connection (Drive/Sheets era), synced to n8n.
  await connectGoogle("google");
  const first = await m.sync.syncCredentialToN8n({ userId: USER, integration: "google" });
  assert.equal(first.synced, true);
  const credId = (first as { n8nCredentialId: string }).n8nCredentialId;

  // Upgrade by connecting "gmail": incremental re-consent into the SAME connection.
  const url = await connectGoogle("gmail");
  assert.equal(url.searchParams.get("include_granted_scopes"), "true");
  assert.ok(url.searchParams.get("scope")!.includes("gmail.send"));
  const second = await m.sync.syncCredentialToN8n({ userId: USER, integration: "gmail" });

  const db = await m.local.readLocalDatabase();
  assert.equal(db.connectionsV2.filter((c) => c.userId === USER).length, 1, "one connection row");
  assert.equal(db.connectionsV2.find((c) => c.userId === USER)!.integration, "google");
  assert.equal((await m.vault.listCredentialsForUser(USER)).length, 1, "one vault credential");
  assert.equal((second as { n8nCredentialId: string }).n8nCredentialId, credId, "same n8n credential");
  assert.deepEqual(n8nCalls.map((c) => c.method), ["POST", "PATCH"], "created once, then updated in place");
  assert.equal(n8nCalls[1].path, `/credentials/${credId}`);
  // n8n gets its own field names, not the raw vault payload.
  const data = n8nCalls[1].body.data as Record<string, unknown>;
  assert.equal(data.clientId, "test-google-client");
  assert.equal((data.oauthTokenData as Record<string, unknown>).access_token, "access-2");
  assert.equal(n8nCalls[1].body.type, "googleOAuth2Api");
});

/* ── Refresh-on-use ──────────────────────────────────────────────── */

test("refresh-on-use: a token expiring in 5 minutes is refreshed before use; vault updated in place", async () => {
  await m.conns.updateConnection(USER, "google", { expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() });
  const callsBefore = n8nCalls.length;
  const r = await m.healthLive.ensureConnectionFresh(USER, "gmail");
  assert.deepEqual(r, { ok: true, refreshed: true });
  const creds = await m.vault.listCredentialsForUser(USER);
  assert.equal(creds.length, 1);
  const payload = (await m.vault.getCredential({ userId: USER, integration: "google", name: "default" }))!.payload;
  assert.equal(payload.accessToken, `access-${tokenSeq}`, "fresh token stored in the same credential");
  assert.equal(payload.refreshToken, "refresh-1");
  assert.deepEqual(n8nCalls.slice(callsBefore).map((c) => c.method), ["PATCH"], "same n8n credential re-synced");

  // A token with plenty of time left is not refreshed.
  const seq = tokenSeq;
  assert.deepEqual(await m.healthLive.ensureConnectionFresh(USER, "sheets"), { ok: true, refreshed: false });
  assert.equal(tokenSeq, seq);
});

/* ── Broken token + reconnect ────────────────────────────────────── */

test("broken token: failed refresh -> broken state + plain owner entry; reconnect restores the SAME credential, no duplicate", async () => {
  await m.conns.updateConnection(USER, "google", { expiresAt: new Date(Date.now() + 60_000).toISOString() });
  tokenMode = "fail";
  const r = await m.healthLive.ensureConnectionFresh(USER, "gmail");
  tokenMode = "ok";
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.state, "needs_reconnect");

  const conn = (await m.conns.getConnection(USER, "google"))!;
  assert.equal(conn.status, "expired");
  assert.ok((conn.metadata as { broken?: unknown }).broken);
  const logs = (await m.local.readLocalDatabase()).usageLogs.filter((l) => l.userId === USER).map((l) => l.action);
  assert.ok(logs.some((a) => a === "Your Gmail connection broke — tap to reconnect. Automations that use it are paused until then."));

  // Stays broken (no silent retry loop) until the user reconnects.
  const seq = tokenSeq;
  assert.equal((await m.healthLive.ensureConnectionFresh(USER, "gmail")).ok, false);
  assert.equal(tokenSeq, seq, "no refresh attempt while broken");

  // One-tap reconnect: same OAuth flow, same row, same vault credential, same n8n credential.
  const credIdBefore = conn.metadata.n8nCredentialId;
  await connectGoogle("gmail");
  await m.sync.syncCredentialToN8n({ userId: USER, integration: "google" });
  const after = (await m.conns.getConnection(USER, "google"))!;
  assert.equal(after.id, conn.id);
  assert.equal(after.status, "connected");
  assert.equal((after.metadata as { broken?: unknown }).broken, null);
  assert.equal(after.metadata.n8nCredentialId, credIdBefore);
  assert.equal((await m.vault.listCredentialsForUser(USER)).length, 1);
  assert.equal((await m.local.readLocalDatabase()).connectionsV2.filter((c) => c.userId === USER).length, 1);
  assert.equal(n8nCalls.filter((c) => c.method === "POST").length, 1, "never a second n8n credential");
});

test("health check: Connected / Needs reconnect without running an automation", async () => {
  const fake = (state: { status: "connected" | "expired"; ok: boolean }) => ({
    getConnection: async () => ({ id: "c", userId: USER, integration: "slack", status: state.status, displayName: null, scopes: [], metadata: {}, expiresAt: null, createdAt: "", updatedAt: "" }) as never,
    refresh: async () => undefined,
    sync: async () => undefined,
    validate: async () => ({ ok: state.ok }),
    markBroken: async () => undefined,
    note: async () => undefined,
    supportsRefresh: () => true,
    now: () => Date.now(),
  });
  assert.equal(await m.health.checkHealth(fake({ status: "connected", ok: true }), USER, "slack"), "connected");
  assert.equal(await m.health.checkHealth(fake({ status: "connected", ok: false }), USER, "slack"), "needs_reconnect");
  assert.equal(await m.health.checkHealth(fake({ status: "expired", ok: true }), USER, "slack"), "needs_reconnect");
});

/* ── First-class ─────────────────────────────────────────────────── */

const CLAIMED = [
  "gmail", "google_calendar", "google", "sheets", "google_forms", "outlook", "outlook_calendar",
  "facebook_pages", "facebook_lead_ads", "instagram", "slack", "telegram", "email", "whatsapp",
  "hubspot", "salesforce", "zoho_crm", "pipedrive", "trello", "asana", "github", "notion",
  "airtable", "discord", "shopify", "woocommerce", "razorpay", "stripe", "webhook", "forms",
];

test("first-class: every claimed app is in the registry and on the Connected Apps list BY NAME; none routes through webhook", async () => {
  const view = await m.apps.listConnectedApps(
    { listConnections: m.conns.listConnectionsForUser, listCustom: async () => [] },
    "00000000-0000-4000-8000-0000000000ff",
  );
  const covered = new Map(view.store.flatMap((card) => card.covers.map((c) => [c.slug, { name: c.name, account: card.account }])));
  for (const slug of CLAIMED) {
    const meta = m.registry.getIntegrationMetadata(slug as never);
    assert.ok(meta, slug);
    const card = covered.get(slug);
    assert.ok(card, `${slug} missing from Connected Apps`);
    assert.equal(card!.name, meta.displayName);
    if (slug !== "webhook") assert.notEqual(card!.account, "webhook", `${slug} must not route through webhook`);
    const account = m.store.accountFor(slug);
    if (m.store.storeAccount(account)!.authKind !== "no_auth") {
      assert.equal(m.providers.getOAuthProvider(account).capabilities.integration, account, `${slug}: provider registered under its own slug`);
    }
  }
  const google = view.store.find((c) => c.account === "google")!;
  assert.deepEqual(google.covers.map((c) => c.name), ["Gmail", "Google Calendar", "Google Drive", "Google Sheets", "Google Forms"]);
  assert.equal(view.storeAppCount, CLAIMED.length, "store count = claimed apps (custom connectors never count)");
  for (const slug of ["notion", "airtable", "discord"]) assert.equal(m.providers.getOAuthProvider(slug).capabilities.integration, slug);
});

test("catalogue honesty: every claimed app has real actions; every action compiles to a real n8n node", () => {
  const ops = m.workflow.allOperations();
  for (const slug of CLAIMED) {
    const mine = ops.filter((o) => o.integration === slug);
    assert.ok(mine.length > 0, `${slug} has no actions`);
    for (const o of mine) {
      const params = Object.fromEntries(o.requiredParams.map((p) => [p, { source: "literal" as const, value: "x" }]));
      const node = m.mapper.mapStepToN8nNode({ id: "s", name: "Step", kind: o.kinds[0], integration: slug as never, operation: o.operation, params, next: [], onError: "fail" }, 0);
      assert.ok(!("__unsupported" in node.parameters), `${slug}.${o.operation} has no n8n mapping`);
      if (!(slug === "forms" && o.operation === "capture_submission")) {
        assert.notEqual(node.type, "n8n-nodes-base.set", `${slug}.${o.operation} is a placeholder Set node`);
      }
    }
  }
  assert.equal(ops.filter((o) => o.integration === "crm").length, 0, "the generic CRM placeholder actions are gone");
});

test("catalogue honesty: sign-in-only accounts are never planned with; Gmail send never injects mail headers", () => {
  const cat = m.catalogue.buildProductionCatalogue();
  assert.ok(!cat.apps.some((a) => a.slug === "microsoft" || a.slug === "meta"));
  assert.ok(!cat.builtins.some((o) => o.operation === "mcp_call"), "internal mcp_call is never offered to the model");
  const node = m.mapper.mapStepToN8nNode({
    id: "send", name: "Send", kind: "notification", integration: "gmail", operation: "send_email", next: [], onError: "fail",
    params: { to: { source: "trigger", ref: "lead.email" }, subject: { source: "literal", value: "Hi" }, body: { source: "template", value: "Hello {{trigger.lead.name}}" } },
  }, 0);
  assert.equal(node.type, "n8n-nodes-base.httpRequest");
  assert.equal(node.parameters.nodeCredentialType, "googleOAuth2Api");
  assert.match(String(node.parameters.body), /replace\(\/\[\\r\\n\]\+\/g/);
});

test("honesty: a prompt naming an app that was NOT built is rejected for exactly that app", () => {
  const cat = m.catalogue.buildProductionCatalogue();
  assert.deepEqual(m.planner.unsupportedAppMentions("When a Mailchimp subscriber joins, add them to my sheet", cat).map((x) => x.label), ["Mailchimp"]);
  assert.deepEqual(m.planner.unsupportedAppMentions("When a new Shopify order comes in, email me", cat), [], "Shopify is genuinely built now");
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}
