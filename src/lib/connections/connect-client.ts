/**
 * Browser-side connect / disconnect / load logic for the Connected Apps page.
 *
 * Every status comes from the SERVER. Nothing here ever marks an app connected
 * on its own: an OAuth app is only "connecting" until the browser is sent to the
 * provider's sign-in page; an API-key app is connected only when the server
 * says so; any error is shown in plain words and the app stays disconnected.
 */

export type ClientStatus = "connected" | "disconnected" | "error";

export interface IntegrationEntry {
  integration: string;
  status: ClientStatus;
  updatedAt: string | null;
}

export type ConnectOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "connected" }
  | { kind: "error"; message: string };

type Fetch = typeof fetch;

/** Turn a server error into one plain sentence the owner can act on. */
export function plainConnectError(appName: string, status: number, serverMessage: string | undefined): string {
  const msg = (serverMessage ?? "").trim();
  if (status === 503 || /not configured/i.test(msg)) {
    return `${appName} sign-in isn't set up on our side yet (its app keys are missing), so it can't be connected right now. Nothing was connected.`;
  }
  if (status === 401) return "Please sign in again, then try connecting.";
  if (status === 429) return "Too many tries in a short time. Please wait a minute and try again.";
  if (/no oauth provider registered|unsupported/i.test(msg)) return `AutomateCraft can't connect to ${appName} yet. Nothing was connected.`;
  if (msg) return `${appName} could not be connected: ${msg}`;
  return `${appName} could not be connected. Please try again.`;
}

export async function requestConnect(
  integration: string,
  appName: string,
  opts: { fetchImpl?: Fetch; credentialPayload?: Record<string, string> } = {},
): Promise<ConnectOutcome> {
  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`/api/connections/${encodeURIComponent(integration)}/connect`, {
      method: "POST",
      ...(opts.credentialPayload
        ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ credentialPayload: opts.credentialPayload }) }
        : {}),
    });
  } catch {
    return { kind: "error", message: "We couldn't reach AutomateCraft. Check your internet and try again. Nothing was connected." };
  }
  const json = (await res.json().catch(() => ({}))) as { kind?: string; authorizationUrl?: string; connection?: unknown; error?: string };
  if (!res.ok) return { kind: "error", message: plainConnectError(appName, res.status, json.error) };
  if (json.kind === "oauth" && typeof json.authorizationUrl === "string" && /^https:\/\//.test(json.authorizationUrl)) {
    return { kind: "redirect", url: json.authorizationUrl };
  }
  if (json.kind === "api_key" && json.connection) return { kind: "connected" };
  return { kind: "error", message: `${appName} could not be connected: the server gave an unexpected answer. Nothing was connected.` };
}

export async function requestDisconnect(
  integration: string,
  appName: string,
  opts: { fetchImpl?: Fetch } = {},
): Promise<{ ok: true } | { ok: false; message: string }> {
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`/api/connections/${encodeURIComponent(integration)}`, { method: "DELETE" });
    if (res.ok) return { ok: true };
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, message: `${appName} could not be disconnected: ${json.error ?? `error ${res.status}`}` };
  } catch {
    return { ok: false, message: "We couldn't reach AutomateCraft. Nothing was changed." };
  }
}

export type LoadOutcome = { ok: true; entries: IntegrationEntry[] } | { ok: false; message: string };

const VALID: ReadonlySet<string> = new Set(["connected", "disconnected", "error"]);

/**
 * Load statuses from /api/integrations. Apps that only exist in the page's own
 * catalogue (not returned by the server) are always shown as not connected.
 * A failed load is reported as a failure — never replaced with made-up statuses.
 */
export async function loadIntegrations(catalogueIds: readonly string[], opts: { fetchImpl?: Fetch } = {}): Promise<LoadOutcome> {
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch("/api/integrations", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as { integrations?: unknown } | null;
    if (!res.ok || !json || !Array.isArray(json.integrations)) {
      return { ok: false, message: "We couldn't load your connections." };
    }
    const entries: IntegrationEntry[] = json.integrations
      .filter((i): i is Record<string, unknown> => !!i && typeof (i as Record<string, unknown>).integration === "string")
      .map((i) => ({
        integration: i.integration as string,
        status: (VALID.has(i.status as string) ? i.status : "disconnected") as ClientStatus,
        updatedAt: typeof i.updatedAt === "string" ? i.updatedAt : null,
      }));
    const seen = new Set(entries.map((e) => e.integration));
    for (const id of catalogueIds) {
      if (!seen.has(id)) entries.push({ integration: id, status: "disconnected", updatedAt: null });
    }
    return { ok: true, entries };
  } catch {
    return { ok: false, message: "We couldn't load your connections." };
  }
}
