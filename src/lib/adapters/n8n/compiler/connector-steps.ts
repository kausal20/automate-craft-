/**
 * n8n node mappings for the connector store operations.
 *
 * Most calls compile to an n8n HTTP Request node that authenticates with the
 * app's ONE account credential (authentication = predefinedCredentialType).
 * That is how Gmail, Calendar, Drive, Sheets and Forms all run on the single
 * Google credential, and Outlook mail + calendar on the single Microsoft one.
 * Telegram and Trello use their dedicated n8n nodes.
 *
 * Param values arrive already compiled (literal strings or n8n "={{ }}"
 * expressions); `js()` turns each into a JavaScript expression so bodies and
 * URLs are built with JSON.stringify / encodeURIComponent inside n8n — user
 * text can never break the JSON or inject extra mail headers.
 */

import { env } from "@/lib/env";
import type { N8nNodeParameters } from "../client/types";

type Compiled = string | number | boolean | undefined;
type Params = N8nNodeParameters;

export interface ConnectorStepMapping {
  type: string;
  typeVersion: number;
  paramsAdjust: (params: Params) => Params;
}

/* ── expression helpers ───────────────────────────────────────────── */

/** Compiled param -> JavaScript expression text (for use inside "={{ ... }}"). */
export function js(value: unknown): string {
  const v = value as Compiled;
  if (v === undefined || v === null) return '""';
  if (typeof v !== "string") return JSON.stringify(v);
  if (!v.startsWith("=")) return JSON.stringify(v);
  const body = v.slice(1);
  const single = /^\{\{\s*([\s\S]+?)\s*\}\}$/.exec(body);
  if (single && !single[1].includes("{{")) return `(${single[1]})`;
  const parts: string[] = [];
  let last = 0;
  for (const m of body.matchAll(/\{\{\s*([\s\S]+?)\s*\}\}/g)) {
    if (m.index! > last) parts.push(JSON.stringify(body.slice(last, m.index)));
    parts.push(`String(${m[1]})`);
    last = m.index! + m[0].length;
  }
  if (last < body.length) parts.push(JSON.stringify(body.slice(last)));
  return parts.length ? `(${parts.join(" + ")})` : '""';
}

/** Header-safe text (no CR/LF), for To / Subject lines. */
const oneLine = (value: unknown) => `String(${js(value)}).replace(/[\\r\\n]+/g, " ")`;
const enc = (value: unknown) => `encodeURIComponent(String(${js(value)}))`;
const expr = (code: string) => `={{ ${code} }}`;

interface HttpSpec {
  method: "GET" | "POST" | "PUT" | "PATCH";
  /** JavaScript expression producing the URL. */
  url: (p: Params) => string;
  credentialType: string;
  query?: (p: Params) => Array<[string, string]>;
  /** JavaScript expression producing the JSON body object. */
  json?: (p: Params) => string;
  raw?: { contentType: string; body: (p: Params) => string };
  headers?: Array<[string, string]>;
}

function http(spec: HttpSpec): ConnectorStepMapping {
  return {
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    paramsAdjust: (p) => {
      const out: Params = {
        method: spec.method,
        url: expr(spec.url(p)),
        authentication: "predefinedCredentialType",
        nodeCredentialType: spec.credentialType,
        options: {},
      };
      const q = spec.query?.(p) ?? [];
      if (q.length) {
        out.sendQuery = true;
        out.queryParameters = { parameters: q.map(([name, value]) => ({ name, value })) };
      }
      if (spec.headers?.length) {
        out.sendHeaders = true;
        out.headerParameters = { parameters: spec.headers.map(([name, value]) => ({ name, value })) };
      }
      if (spec.json) {
        out.sendBody = true;
        out.contentType = "json";
        out.specifyBody = "json";
        out.jsonBody = expr(`JSON.stringify(${spec.json(p)})`);
      } else if (spec.raw) {
        out.sendBody = true;
        out.contentType = "raw";
        out.rawContentType = spec.raw.contentType;
        out.body = expr(spec.raw.body(p));
      }
      return out;
    },
  };
}

const str = (s: string) => JSON.stringify(s);
const GOOGLE = "googleOAuth2Api";
const MICROSOFT = "microsoftOAuth2Api";
const META = "facebookGraphApi";
const GRAPH = "https://graph.facebook.com/v19.0";
const MS = "https://graph.microsoft.com/v1.0";
/** A single value or a list -> one sheet row. */
const row = (v: unknown) => `(Array.isArray(${js(v)}) ? ${js(v)} : [${js(v)}])`;
const zohoApi = () => `https://www.zohoapis.${(env.oauth.zoho.domain || "zoho.com").replace(/^zoho\./, "")}/crm/v2`;

export const CONNECTOR_STEP_MAPPINGS: Record<string, ConnectorStepMapping> = {
  /* ── Gmail (Google account) ── */
  "gmail::list_emails": http({
    method: "GET", credentialType: GOOGLE,
    url: () => str("https://gmail.googleapis.com/gmail/v1/users/me/messages"),
    query: (p) => [["q", String(p.query ?? "")], ["maxResults", "10"]],
  }),
  "gmail::send_email": http({
    method: "POST", credentialType: GOOGLE,
    url: () => str("https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media"),
    raw: {
      contentType: "message/rfc822",
      body: (p) =>
        `"To: " + ${oneLine(p.to)} + "\\r\\nSubject: " + ${oneLine(p.subject)} + "\\r\\nContent-Type: text/plain; charset=UTF-8\\r\\n\\r\\n" + String(${js(p.body)})`,
    },
  }),

  /* ── Google Calendar ── */
  "google_calendar::list_events": http({
    method: "GET", credentialType: GOOGLE,
    url: () => str("https://www.googleapis.com/calendar/v3/calendars/primary/events"),
    query: () => [["singleEvents", "true"], ["orderBy", "startTime"], ["maxResults", "10"], ["timeMin", "={{ $now.toISO() }}"]],
  }),
  "google_calendar::create_event": http({
    method: "POST", credentialType: GOOGLE,
    url: () => str("https://www.googleapis.com/calendar/v3/calendars/primary/events"),
    json: (p) => `{ summary: ${js(p.summary)}, start: { dateTime: ${js(p.start)} }, end: { dateTime: ${js(p.end)} } }`,
  }),

  /* ── Google Drive (drive.file scope: files this app creates) ── */
  "google::drive_upload": http({
    method: "POST", credentialType: GOOGLE,
    url: () => str("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"),
    raw: {
      contentType: "multipart/related; boundary=ac_part",
      body: (p) =>
        `"--ac_part\\r\\nContent-Type: application/json; charset=UTF-8\\r\\n\\r\\n" + JSON.stringify(Object.assign({ name: String(${js(p.filename)}) }, ${p.folder_id === undefined ? "{}" : `{ parents: [String(${js(p.folder_id)})] }`})) + "\\r\\n--ac_part\\r\\nContent-Type: text/plain; charset=UTF-8\\r\\n\\r\\n" + String(${js(p.content)}) + "\\r\\n--ac_part--"`,
    },
  }),
  "google::list_files": http({
    method: "GET", credentialType: GOOGLE,
    url: () => str("https://www.googleapis.com/drive/v3/files"),
    query: (p) => [["q", String(p.query ?? "")], ["pageSize", "10"]],
  }),

  /* ── Google Sheets (same Google credential) ── */
  "sheets::append_row": http({
    method: "POST", credentialType: GOOGLE,
    url: (p) => `"https://sheets.googleapis.com/v4/spreadsheets/" + ${enc(p.sheet)} + "/values/A1:append?valueInputOption=USER_ENTERED"`,
    json: (p) => `{ values: [${row(p.values)}] }`,
  }),
  "sheets::read_range": http({
    method: "GET", credentialType: GOOGLE,
    url: (p) => `"https://sheets.googleapis.com/v4/spreadsheets/" + ${enc(p.sheet)} + "/values/" + ${enc(p.range)}`,
  }),
  "sheets::update_row": http({
    method: "PUT", credentialType: GOOGLE,
    url: (p) => `"https://sheets.googleapis.com/v4/spreadsheets/" + ${enc(p.sheet)} + "/values/" + ${enc(p.row)} + "?valueInputOption=USER_ENTERED"`,
    json: (p) => `{ values: [${row(p.values)}] }`,
  }),

  /* ── Google Forms ── */
  "google_forms::list_responses": http({
    method: "GET", credentialType: GOOGLE,
    url: (p) => `"https://forms.googleapis.com/v1/forms/" + ${enc(p.form_id)} + "/responses"`,
  }),

  /* ── Outlook mail + calendar (one Microsoft credential) ── */
  "outlook::send_email": http({
    method: "POST", credentialType: MICROSOFT,
    url: () => str(`${MS}/me/sendMail`),
    json: (p) =>
      `{ message: { subject: ${oneLine(p.subject)}, body: { contentType: "Text", content: String(${js(p.body)}) }, toRecipients: [{ emailAddress: { address: ${oneLine(p.to)} } }] } }`,
  }),
  "outlook::list_emails": http({
    method: "GET", credentialType: MICROSOFT,
    url: () => str(`${MS}/me/messages`),
    query: () => [["$top", "10"]],
  }),
  "outlook_calendar::list_events": http({
    method: "GET", credentialType: MICROSOFT,
    url: () => str(`${MS}/me/events`),
    query: () => [["$top", "10"]],
  }),
  "outlook_calendar::create_event": http({
    method: "POST", credentialType: MICROSOFT,
    url: () => str(`${MS}/me/events`),
    json: (p) =>
      `{ subject: ${js(p.summary)}, start: { dateTime: ${js(p.start)}, timeZone: "UTC" }, end: { dateTime: ${js(p.end)}, timeZone: "UTC" } }`,
  }),

  /* ── Meta (one credential) ── */
  "facebook_pages::list_posts": http({
    method: "GET", credentialType: META,
    url: (p) => `"${GRAPH}/" + ${enc(p.page_id)} + "/posts"`,
  }),
  "facebook_lead_ads::list_leads": http({
    method: "GET", credentialType: META,
    url: (p) => `"${GRAPH}/" + ${enc(p.form_id)} + "/leads"`,
  }),
  "instagram::list_media": http({
    method: "GET", credentialType: META,
    url: (p) => `"${GRAPH}/" + ${enc(p.ig_user_id)} + "/media"`,
    query: () => [["fields", "id,caption,media_type,permalink,timestamp"]],
  }),

  /* ── Slack (deepened) ── */
  "slack::read_messages": http({
    method: "GET", credentialType: "slackApi",
    url: () => str("https://slack.com/api/conversations.history"),
    query: (p) => [["channel", String(p.channel ?? "")], ["limit", "20"]],
  }),

  /* ── Telegram (dedicated node) ── */
  "telegram::send_message": {
    type: "n8n-nodes-base.telegram",
    typeVersion: 1.2,
    paramsAdjust: (p) => ({ resource: "message", operation: "sendMessage", chatId: p.chat_id, text: p.text, additionalFields: {} }),
  },

  /* ── HubSpot (deepened) ── */
  "hubspot::search_contact": http({
    method: "POST", credentialType: "hubspotOAuth2Api",
    url: () => str("https://api.hubapi.com/crm/v3/objects/contacts/search"),
    json: (p) => `{ filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: ${js(p.email)} }] }], limit: 10 }`,
  }),
  "hubspot::list_deals": http({
    method: "GET", credentialType: "hubspotOAuth2Api",
    url: () => str("https://api.hubapi.com/crm/v3/objects/deals"),
    query: () => [["limit", "10"]],
  }),

  /* ── Zoho CRM ── */
  "zoho_crm::create_lead": http({
    method: "POST", credentialType: "zohoOAuth2Api",
    url: () => str(`${zohoApi()}/Leads`),
    json: (p) => `{ data: [{ Last_Name: ${js(p.last_name)}, Company: ${js(p.company)}${p.email === undefined ? "" : `, Email: ${js(p.email)}`} }] }`,
  }),
  "zoho_crm::create_contact": http({
    method: "POST", credentialType: "zohoOAuth2Api",
    url: () => str(`${zohoApi()}/Contacts`),
    json: (p) => `{ data: [{ Last_Name: ${js(p.last_name)}${p.email === undefined ? "" : `, Email: ${js(p.email)}`} }] }`,
  }),
  "zoho_crm::list_leads": http({
    method: "GET", credentialType: "zohoOAuth2Api",
    url: () => str(`${zohoApi()}/Leads`),
    query: () => [["per_page", "10"]],
  }),

  /* ── Pipedrive ── */
  "pipedrive::create_person": http({
    method: "POST", credentialType: "pipedriveOAuth2Api",
    url: () => str("https://api.pipedrive.com/v1/persons"),
    json: (p) => `{ name: ${js(p.name)}${p.email === undefined ? "" : `, email: [${js(p.email)}]`} }`,
  }),
  "pipedrive::create_deal": http({
    method: "POST", credentialType: "pipedriveOAuth2Api",
    url: () => str("https://api.pipedrive.com/v1/deals"),
    json: (p) => `{ title: ${js(p.title)} }`,
  }),
  "pipedrive::list_deals": http({
    method: "GET", credentialType: "pipedriveOAuth2Api",
    url: () => str("https://api.pipedrive.com/v1/deals"),
    query: () => [["limit", "10"]],
  }),

  /* ── Trello (dedicated node, API key + token) ── */
  "trello::create_card": {
    type: "n8n-nodes-base.trello",
    typeVersion: 1,
    paramsAdjust: (p) => ({ resource: "card", operation: "create", listId: p.list_id, name: p.name, description: p.description ?? "", additionalFields: {} }),
  },
  "trello::list_cards": {
    type: "n8n-nodes-base.trello",
    typeVersion: 1,
    paramsAdjust: (p) => ({ resource: "list", operation: "getCards", id: p.list_id, returnAll: false, limit: 50, additionalFields: {} }),
  },

  /* ── Asana ── */
  "asana::create_task": http({
    method: "POST", credentialType: "asanaOAuth2Api",
    url: () => str("https://app.asana.com/api/1.0/tasks"),
    json: (p) => `{ data: { workspace: ${js(p.workspace)}, name: ${js(p.name)}${p.notes === undefined ? "" : `, notes: ${js(p.notes)}`} } }`,
  }),
  "asana::list_tasks": http({
    method: "GET", credentialType: "asanaOAuth2Api",
    url: () => str("https://app.asana.com/api/1.0/tasks"),
    query: (p) => [["project", String(p.project ?? "")], ["limit", "20"]],
  }),

  /* ── GitHub ── */
  "github::create_issue": http({
    method: "POST", credentialType: "githubOAuth2Api",
    url: (p) => `"https://api.github.com/repos/" + ${enc(p.owner)} + "/" + ${enc(p.repo)} + "/issues"`,
    json: (p) => `{ title: ${js(p.title)}${p.body === undefined ? "" : `, body: ${js(p.body)}`} }`,
  }),
  "github::list_issues": http({
    method: "GET", credentialType: "githubOAuth2Api",
    url: (p) => `"https://api.github.com/repos/" + ${enc(p.owner)} + "/" + ${enc(p.repo)} + "/issues"`,
    query: () => [["state", "open"], ["per_page", "20"]],
  }),
  "github::get_repo": http({
    method: "GET", credentialType: "githubOAuth2Api",
    url: (p) => `"https://api.github.com/repos/" + ${enc(p.owner)} + "/" + ${enc(p.repo)}`,
  }),

  /* ── Notion ── */
  "notion::create_page": http({
    method: "POST", credentialType: "notionApi",
    url: () => str("https://api.notion.com/v1/pages"),
    headers: [["Notion-Version", "2022-06-28"]],
    json: (p) =>
      `{ parent: { page_id: ${js(p.parent_page_id)} }, properties: { title: { title: [{ text: { content: String(${js(p.title)}) } }] } }${
        p.content === undefined ? "" : `, children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: String(${js(p.content)}) } }] } }]`
      } }`,
  }),
  "notion::search": http({
    method: "POST", credentialType: "notionApi",
    url: () => str("https://api.notion.com/v1/search"),
    headers: [["Notion-Version", "2022-06-28"]],
    json: (p) => `{ query: String(${js(p.query)}), page_size: 10 }`,
  }),

  /* ── Airtable ── */
  "airtable::create_record": http({
    method: "POST", credentialType: "airtableTokenApi",
    url: (p) => `"https://api.airtable.com/v0/" + ${enc(p.base_id)} + "/" + ${enc(p.table)}`,
    json: (p) => `{ fields: { [String(${js(p.field)})]: ${js(p.value)} } }`,
  }),
  "airtable::list_records": http({
    method: "GET", credentialType: "airtableTokenApi",
    url: (p) => `"https://api.airtable.com/v0/" + ${enc(p.base_id)} + "/" + ${enc(p.table)}`,
    query: () => [["maxRecords", "10"]],
  }),

  /* ── Discord (channel webhook returned at consent) ── */
  "discord::send_message": {
    type: "n8n-nodes-base.discord",
    typeVersion: 2,
    paramsAdjust: (p) => ({ authentication: "webhook", operation: "sendLegacy", content: p.content, options: {} }),
  },

  /* ── Commerce ── */
  "shopify::list_orders": http({
    method: "GET", credentialType: "shopifyAccessTokenApi",
    url: (p) => `"https://" + ${enc(p.shop)} + ".myshopify.com/admin/api/2024-07/orders.json"`,
    query: () => [["status", "any"], ["limit", "10"]],
  }),
  "woocommerce::list_orders": http({
    method: "GET", credentialType: "wooCommerceApi",
    url: (p) => `String(${js(p.store_url)}).replace(/\\/+$/, "") + "/wp-json/wc/v3/orders"`,
    query: () => [["per_page", "10"]],
  }),
};

/* ── A user's own MCP tool: the step calls OUR backend, which holds the vault credential ── */
CONNECTOR_STEP_MAPPINGS["(builtin)::mcp_call"] = {
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  paramsAdjust: (p) => {
    let inputMap: Record<string, string> = {};
    try {
      inputMap = JSON.parse(String(p.input_map ?? "{}"));
    } catch {
      inputMap = {};
    }
    const inputs = Object.entries(inputMap)
      .filter(([param]) => p[param] !== undefined)
      .map(([param, real]) => `${JSON.stringify(real)}: ${js(p[param])}`)
      .join(", ");
    const base = (env.publicSiteUrl || "").replace(/\/+$/, "");
    return {
      method: "POST",
      url: `${base}/api/connectors/mcp/execute`,
      authentication: "none",
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: expr(`JSON.stringify({ connectorId: ${js(p.connector_id)}, tool: ${js(p.tool)}, token: ${js(p.token)}, inputs: { ${inputs} } })`),
      options: { timeout: 35000 },
    };
  },
};

/** Existing node mappings that need the OAuth credential selected explicitly. */
export const NODE_AUTH_OVERRIDES: Record<string, Params> = {
  "n8n-nodes-base.hubspot": { authentication: "oAuth2" },
};
