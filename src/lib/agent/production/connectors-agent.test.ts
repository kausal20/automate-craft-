/**
 * Connectors through the AGENT: connect-once reuse, "which account?",
 * a user's own MCP tool inside a real build, isolation and honesty via the
 * per-user agent catalogue. Real service/planner gate/generator/compiler;
 * mocked Gemini, n8n and MCP server.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { USER_A, USER_B, harness } from "./fakes.test.ts";
import type { BrainPlan } from "../brain/plan-schema.ts";
import { McpConnectorService, type ConnectorRepo, type CustomConnector, type SecretStore } from "../../mcp/service.ts";
import { signToolCall, verifyToolCall } from "../../mcp/signing.ts";
import type { McpAuth } from "../../mcp/client.ts";

const SECRET = "connectors-test-secret-123";

function plan(steps: BrainPlan["steps"], missing: BrainPlan["missingFields"] = []): BrainPlan {
  return {
    name: "Connector test",
    summary: "Uses connected apps.",
    language: "en",
    trigger: { kind: "webhook", integration: null, config: { event: "new_lead" } },
    steps,
    appsRequired: [],
    missingFields: missing,
    unsupportedRequests: [],
  };
}

const gmailAndCalendar = () =>
  plan([
    { id: "mail_owner", label: "Email me the lead", kind: "notification", integration: "gmail", operation: "send_email", next: ["book_call"], errorPolicy: "fail",
      params: { to: { source: "literal", value: "owner@shop.in" }, subject: { source: "literal", value: "New lead" }, body: { source: "template", value: "Lead: {{trigger.lead.name}}" } } },
    { id: "book_call", label: "Put a call in my calendar", kind: "action", integration: "google_calendar", operation: "create_event", next: [], errorPolicy: "fail",
      params: { summary: { source: "literal", value: "Call lead" }, start: { source: "trigger", ref: "lead.start" }, end: { source: "trigger", ref: "lead.end" } } },
  ]);

const TEST_ANSWERS = { "test.gmail.to": "me@shop.in" };

/* ── Reuse: connect once, then only allow ────────────────────────── */

test("reuse: Gmail + Calendar both run on the ONE stored Google connection — no new sign-in", async () => {
  const h = harness({ plan: gmailAndCalendar() });
  h.directory.add(USER_A, "google", "owner@shop.in");
  const p = await h.service.preview({ userId: USER_A, prompt: "email me new leads and add a calendar call" });
  assert.equal(p.connections.length, 0, "no connection step");
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: TEST_ANSWERS });
  assert.equal(c.status, "active", JSON.stringify(c));
  assert.deepEqual(h.binder.bound.at(-1)!.selections.map((s) => s.integration), ["google"], "one account bound for two apps");
  const wf = [...h.n8n.workflows.values()][0].workflow;
  for (const name of ["mail_owner", "book_call"]) {
    const node = wf.nodes.find((n) => n.name === name)!;
    assert.equal(node.type, "n8n-nodes-base.httpRequest");
    assert.equal(node.parameters.nodeCredentialType, "googleOAuth2Api");
  }
});

test("reuse: Slack and HubSpot automations use the stored connections with no new sign-in", async () => {
  const h = harness({
    plan: plan([
      { id: "find_contact", label: "Find the contact", kind: "action", integration: "hubspot", operation: "search_contact", next: ["post"], errorPolicy: "fail", params: { email: { source: "trigger", ref: "lead.email" } } },
      { id: "post", label: "Tell the team", kind: "notification", integration: "slack", operation: "post_message", next: [], errorPolicy: "fail", params: { channel: { source: "literal", value: "#sales" }, text: { source: "literal", value: "New lead" } } },
    ]),
  });
  h.directory.add(USER_A, "hubspot", "crm@shop.in");
  h.directory.add(USER_A, "slack", "Shop workspace");
  const p = await h.service.preview({ userId: USER_A, prompt: "find the contact in hubspot and post in slack" });
  assert.equal(p.connections.length, 0);
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: { "test.slack.channel": "#my-test" } });
  assert.equal(c.status, "active", JSON.stringify(c));
});

test("reuse: two Google accounts -> the agent asks which account, then uses the pick", async () => {
  const h = harness({ plan: gmailAndCalendar() });
  h.directory.add(USER_A, "google", "owner@shop.in");
  const second = h.directory.add(USER_A, "google", "sales@shop.in");
  const p = await h.service.preview({ userId: USER_A, prompt: "email me and book a call" });
  assert.equal(p.status, "needs_input");
  const c1 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: TEST_ANSWERS });
  assert.equal(c1.status, "needs_connection");
  if (c1.status === "needs_connection") {
    assert.equal(c1.connections[0].label, "Google");
    assert.equal(c1.connections[0].state, "choose");
    assert.deepEqual(c1.connections[0].options.map((o) => o.label), ["owner@shop.in", "sales@shop.in"]);
  }
  const c2 = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, selections: [{ integration: "google", connectionId: second.connectionId }] });
  assert.equal(c2.status, "active");
  assert.equal(h.binder.bound.at(-1)!.selections[0].connectionId, second.connectionId);
});

test("disconnecting the Google account pauses automations using ANY Google app", async () => {
  const h = harness({ plan: gmailAndCalendar() });
  h.directory.add(USER_A, "google", "owner@shop.in");
  const p = await h.service.preview({ userId: USER_A, prompt: "email me and book a call" });
  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true, answers: TEST_ANSWERS });
  assert.equal(await h.service.onConnectionLost(USER_A, "google"), 1);
  const v = await h.service.get(USER_A, (c as { automationId: string }).automationId);
  assert.equal(v.status, "needs_attention");
  assert.match(v.message!, /Google connection stopped working/);
});

/* ── A user's own MCP tool inside a real build ───────────────────── */

class MemRepo implements ConnectorRepo {
  rows: CustomConnector[] = [];
  async create(c: CustomConnector) { this.rows.push(structuredClone(c)); return c; }
  async get(u: string, id: string) { const r = this.rows.find((x) => x.id === id && x.userId === u); return r ? structuredClone(r) : null; }
  async list(u: string) { return this.rows.filter((x) => x.userId === u).map((r) => structuredClone(r)); }
  async update(u: string, id: string, p: Partial<CustomConnector>) { const r = this.rows.find((x) => x.id === id && x.userId === u); if (!r) return null; Object.assign(r, p); return structuredClone(r); }
  async remove(u: string, id: string) { const n = this.rows.length; this.rows = this.rows.filter((x) => !(x.id === id && x.userId === u)); return this.rows.length < n; }
}
const secrets: SecretStore = { put: async () => undefined, get: async () => ({ type: "none" }) as McpAuth, remove: async () => undefined };

async function mcpSetup() {
  const mcp = new McpConnectorService({
    repo: new MemRepo(), secrets, newId: () => "22222222-2222-4222-8222-000000000001",
    onLost: async () => undefined, record: async () => undefined, resolver: async () => ["93.184.216.34"], allowPrivate: false,
    inspect: async () => ({
      name: "Acme Helpdesk", version: "1",
      tools: [
        { name: "create-ticket", description: "Create a ticket", inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] } },
        { name: "delete-everything", description: "Danger", inputSchema: { type: "object", properties: {} } },
      ],
    }),
  });
  const view = await mcp.add(USER_A, { url: "https://helpdesk.example.com/mcp", auth: { type: "none" }, approvedTools: ["create-ticket"] });
  return { mcp, view };
}

function mcpPlan(slug: string, operation = "create_ticket") {
  return plan([{ id: "make_ticket", label: "Open a helpdesk ticket", kind: "action", integration: slug, operation, next: [], errorPolicy: "fail", params: { title: { source: "trigger", ref: "lead.name" } } }]);
}

function mcpDeps(mcp: McpConnectorService) {
  return {
    customApps: (userId: string) => mcp.catalogueApps(userId),
    mcp: { resolve: (u: string, s: string, o: string) => mcp.resolve(u, s, o), sign: (claims: Parameters<typeof signToolCall>[0]) => signToolCall(claims, SECRET) },
  };
}

test("custom MCP: an approved tool is planned, previewed, confirmed and compiled to a signed call through our backend", async () => {
  const { mcp, view } = await mcpSetup();
  const h = harness({ plan: mcpPlan(view.slug), ...mcpDeps(mcp) });
  // The live directory lists the user's own connectors as accounts for their "mcp_..." app.
  h.directory.add(USER_A, view.slug, view.displayName);
  const p = await h.service.preview({ userId: USER_A, prompt: "open a helpdesk ticket for each new lead" });
  assert.equal(p.status, "ready", JSON.stringify(p));
  assert.match(p.preview, /Open a helpdesk ticket/);
  assert.equal(h.n8n.calls.length, 0, "nothing runs before confirm");

  const c = await h.service.confirm({ userId: USER_A, draftId: p.draftId!, confirm: true });
  assert.equal(c.status, "active", JSON.stringify(c));
  const node = [...h.n8n.workflows.values()][0].workflow.nodes.find((n) => n.name === "make_ticket")!;
  assert.equal(node.type, "n8n-nodes-base.httpRequest");
  assert.match(String(node.parameters.url), /\/api\/connectors\/mcp\/execute$/);
  assert.equal(node.credentials, undefined, "no n8n credential is faked for MCP");
  const token = /token: "([^"]+)"/.exec(String(node.parameters.jsonBody))![1];
  const claims = verifyToolCall(token, SECRET)!;
  assert.equal(claims.userId, USER_A);
  assert.equal(claims.connectorId, view.id);
  assert.equal(claims.tool, "create-ticket");
  assert.match(String(node.parameters.jsonBody), /"title": \(\$json\.lead\.name\)/);
});

test("custom MCP: a tool the user did not switch on cannot be planned", async () => {
  const { mcp, view } = await mcpSetup();
  const h = harness({ plan: mcpPlan(view.slug, "delete_everything"), ...mcpDeps(mcp) });
  const p = await h.service.preview({ userId: USER_A, prompt: "delete everything in the helpdesk" });
  assert.equal(p.status, "rejected");
});

test("isolation: user B's agent cannot see or plan with user A's custom tool", async () => {
  const { mcp, view } = await mcpSetup();
  const h = harness({ plan: mcpPlan(view.slug), ...mcpDeps(mcp) });
  const p = await h.service.preview({ userId: USER_B, prompt: "open a helpdesk ticket" });
  assert.equal(p.status, "rejected");
  assert.equal(await mcp.resolve(USER_B, view.slug, "create_ticket"), null);
});

test("honesty: a custom tool the user has NOT added is rejected for exactly that part", async () => {
  const { mcp } = await mcpSetup();
  const h = harness({ plan: mcpPlan("mcp_99999999999949998999000000000001"), ...mcpDeps(mcp) });
  const p = await h.service.preview({ userId: USER_A, prompt: "use my billing connector" });
  assert.equal(p.status, "rejected");
  assert.match(p.reason!, /can't connect to/);
});

test("honesty: a store app that was not built (Mailchimp) is rejected; a built one (Notion) is accepted", async () => {
  const h = harness({ plan: plan([{ id: "page", label: "Make a Notion page", kind: "save", integration: "notion", operation: "create_page", next: [], errorPolicy: "fail", params: { parent_page_id: { source: "literal", value: "abc" }, title: { source: "literal", value: "Lead" } } }]) });
  const bad = await h.service.preview({ userId: USER_A, prompt: "add every Mailchimp subscriber to Notion" });
  assert.equal(bad.status, "rejected");
  assert.match(bad.reason!, /Mailchimp/);
  h.directory.add(USER_A, "notion", "Shop workspace");
  const ok = await h.service.preview({ userId: USER_A, prompt: "make a Notion page for each lead" });
  assert.equal(ok.status, "ready");
});
