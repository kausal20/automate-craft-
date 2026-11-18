/**
 * Minimal remote MCP client — no new dependency.
 *
 * Transport: Streamable HTTP (POST JSON-RPC; the reply is JSON or an SSE
 * stream). If the server only offers the older HTTP+SSE transport (POST gives
 * 404/405), we fall back to it: GET the SSE stream, read the "endpoint" event,
 * POST messages there and read replies from the stream.
 *
 * Safety: every request has a timeout, every response body is size-capped,
 * redirects are refused (a redirect could point at a private address), and the
 * legacy endpoint must stay on the same origin. Auth headers are never logged.
 * Tool results are returned as DATA; nothing here interprets them.
 */

export const PROTOCOL_VERSION = "2025-06-18";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const MAX_LIST_BYTES = 1_000_000;
export const MAX_CALL_BYTES = 256_000;

export type McpAuth =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "header"; headerName: string; value: string };

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServerInfo {
  name: string;
  version: string | null;
  tools: McpTool[];
}

export class McpError extends Error {
  readonly plain: string;
  readonly kind: "unreachable" | "auth" | "oauth_required" | "protocol" | "timeout" | "too_large" | "redirect" | "tool_error";
  constructor(kind: McpError["kind"], plain: string, technical?: string) {
    super(technical ?? plain);
    this.name = "McpError";
    this.kind = kind;
    this.plain = plain;
  }
}

type Json = Record<string, unknown>;

function authHeaders(auth: McpAuth): Record<string, string> {
  if (auth.type === "bearer") return { Authorization: `Bearer ${auth.token}` };
  if (auth.type === "header") {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(auth.headerName)) throw new McpError("protocol", "That header name isn't valid.");
    return { [auth.headerName]: auth.value };
  }
  return {};
}

async function readLimited(res: Response, max: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      throw new McpError("too_large", "The server sent back more data than we allow.");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Parse SSE text into data payloads (joined multi-line data). */
function sseMessages(text: string): Array<{ event: string; data: string }> {
  const out: Array<{ event: string; data: string }> = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (data.length) out.push({ event, data: data.join("\n") });
  }
  return out;
}

function statusError(status: number): McpError {
  if (status === 401 || status === 403) return new McpError("auth", "The server refused the key or token. Check it and try again.", `HTTP ${status}`);
  return new McpError("unreachable", `The server answered with an error (code ${status}).`, `HTTP ${status}`);
}

export interface McpClientOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** One session against one server. Use `withMcpSession` so the session always closes. */
export class McpSession {
  private readonly url: URL;
  private readonly auth: McpAuth;
  private readonly doFetch: typeof fetch;
  private readonly timeoutMs: number;
  private sessionId: string | null = null;
  private seq = 0;
  private legacy: { endpoint: URL; pending: Map<number, (msg: Json) => void>; abort: AbortController } | null = null;

  constructor(url: URL, auth: McpAuth, opts: McpClientOptions = {}) {
    this.url = url;
    this.auth = auth;
    this.doFetch = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async post(target: URL, body: Json, maxBytes: number): Promise<{ status: number; text: string; type: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.doFetch(target, {
        method: "POST",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...(this.sessionId ? { "mcp-session-id": this.sessionId } : {}),
          ...(this.seq > 1 ? { "mcp-protocol-version": PROTOCOL_VERSION } : {}),
          ...authHeaders(this.auth),
        },
        body: JSON.stringify(body),
      });
      if (res.status >= 300 && res.status < 400) throw new McpError("redirect", "The server tried to send us somewhere else, which isn't allowed.");
      if (res.status === 401 && /resource_metadata|oauth/i.test(res.headers.get("www-authenticate") ?? "") && this.auth.type === "none") {
        throw new McpError("oauth_required", "This server wants you to sign in on its own page. That kind of sign-in can't be completed here yet, so nothing was saved.", "HTTP 401 oauth");
      }
      const sid = res.headers.get("mcp-session-id");
      if (sid) this.sessionId = sid;
      const text = res.status === 202 ? "" : await readLimited(res, maxBytes);
      return { status: res.status, text, type: res.headers.get("content-type") ?? "" };
    } catch (error) {
      if (error instanceof McpError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new McpError("timeout", "The server took too long to answer.");
      throw new McpError("unreachable", "We couldn't reach that server.", error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  private pickReply(res: { text: string; type: string }, id: number): Json {
    const candidates: Json[] = [];
    if (res.type.includes("text/event-stream")) {
      for (const m of sseMessages(res.text)) {
        try {
          candidates.push(JSON.parse(m.data));
        } catch {
          /* ignore non-JSON events */
        }
      }
    } else if (res.text.trim()) {
      try {
        const parsed = JSON.parse(res.text);
        candidates.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      } catch {
        throw new McpError("protocol", "The server's answer wasn't in the expected format.");
      }
    }
    const reply = candidates.find((c) => c.id === id);
    if (!reply) throw new McpError("protocol", "The server didn't answer our request.");
    return reply;
  }

  private async request(method: string, params: Json, maxBytes = MAX_LIST_BYTES): Promise<Json> {
    const id = ++this.seq;
    const message = { jsonrpc: "2.0", id, method, params };
    let reply: Json;
    if (this.legacy) {
      reply = await this.legacyRequest(id, message, maxBytes);
    } else {
      const res = await this.post(this.url, message, maxBytes);
      if (res.status >= 400) throw statusError(res.status);
      reply = this.pickReply(res, id);
    }
    if (reply.error) {
      const err = reply.error as { message?: string; code?: number };
      throw new McpError(method === "tools/call" ? "tool_error" : "protocol", "The server reported an error.", `${err.code}: ${err.message}`);
    }
    return (reply.result ?? {}) as Json;
  }

  private async notify(method: string): Promise<void> {
    const msg = { jsonrpc: "2.0", method };
    if (this.legacy) {
      await this.post(this.legacy.endpoint, msg, 10_000).catch(() => undefined);
      return;
    }
    await this.post(this.url, msg, 10_000).catch(() => undefined);
  }

  async initialize(): Promise<{ name: string; version: string | null }> {
    const params = { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "AutomateCraft", version: "1.0" } };
    let result: Json;
    try {
      result = await this.request("initialize", params);
    } catch (error) {
      // Older servers only speak HTTP+SSE: POST is not allowed on the base URL.
      if (error instanceof McpError && /HTTP (404|405)$/.test(error.message)) {
        await this.openLegacy();
        this.seq = 0;
        result = await this.request("initialize", params);
      } else if (error instanceof McpError && error.kind === "auth" && /HTTP 401/.test(error.message)) {
        throw error;
      } else {
        throw error;
      }
    }
    await this.notify("notifications/initialized");
    const info = (result.serverInfo ?? {}) as { name?: string; version?: string };
    return { name: typeof info.name === "string" && info.name.trim() ? info.name.trim().slice(0, 80) : this.url.hostname, version: info.version ?? null };
  }

  async listTools(): Promise<McpTool[]> {
    const tools: McpTool[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page++) {
      const result = await this.request("tools/list", cursor ? { cursor } : {});
      for (const t of (result.tools as Json[] | undefined) ?? []) {
        if (typeof t.name !== "string") continue;
        tools.push({
          name: t.name.slice(0, 128),
          description: typeof t.description === "string" ? t.description.replace(/[\u0000-\u001f]+/g, " ").slice(0, 300) : "",
          inputSchema: (t.inputSchema && typeof t.inputSchema === "object" ? t.inputSchema : { type: "object" }) as Json,
        });
      }
      cursor = typeof result.nextCursor === "string" ? result.nextCursor : undefined;
      if (!cursor) break;
    }
    return tools;
  }

  /** Result is DATA from an untrusted server. Callers must never treat it as instructions. */
  async callTool(name: string, args: Json): Promise<{ isError: boolean; content: unknown }> {
    const result = await this.request("tools/call", { name, arguments: args }, MAX_CALL_BYTES);
    return { isError: result.isError === true, content: result.structuredContent ?? result.content ?? null };
  }

  /* ── legacy HTTP+SSE transport ── */

  private async openLegacy(): Promise<void> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.doFetch(this.url, {
        method: "GET",
        redirect: "manual",
        signal: abort.signal,
        headers: { accept: "text/event-stream", ...authHeaders(this.auth) },
      });
    } catch (error) {
      clearTimeout(timer);
      throw new McpError("unreachable", "We couldn't reach that server.", error instanceof Error ? error.message : String(error));
    }
    if (res.status >= 300 && res.status < 400) throw new McpError("redirect", "The server tried to send us somewhere else, which isn't allowed.");
    if (res.status === 401 || res.status === 403) throw statusError(res.status);
    if (!res.ok || !res.body) throw new McpError("unreachable", "That server doesn't offer a connection we can use.", `legacy GET ${res.status}`);

    const pending = new Map<number, (msg: Json) => void>();
    let resolveEndpoint!: (u: URL) => void;
    let rejectEndpoint!: (e: Error) => void;
    const endpointReady = new Promise<URL>((r, j) => {
      resolveEndpoint = r;
      rejectEndpoint = j;
    });
    const reader = res.body.getReader();
    let buffer = "";
    let total = 0;
    void (async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > MAX_LIST_BYTES * 2) break;
          buffer += new TextDecoder().decode(value, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() ?? "";
          for (const m of sseMessages(blocks.join("\n\n") + "\n\n")) {
            if (m.event === "endpoint") {
              const ep = new URL(m.data, this.url);
              if (ep.origin !== this.url.origin) rejectEndpoint(new McpError("protocol", "The server pointed us to a different address, which isn't allowed."));
              else resolveEndpoint(ep);
            } else {
              try {
                const msg = JSON.parse(m.data) as Json;
                if (typeof msg.id === "number") pending.get(msg.id)?.(msg);
              } catch {
                /* ignore */
              }
            }
          }
        }
      } catch {
        /* stream closed */
      }
    })();
    try {
      const endpoint = await endpointReady;
      clearTimeout(timer);
      this.legacy = { endpoint, pending, abort };
    } catch (error) {
      abort.abort();
      clearTimeout(timer);
      throw error;
    }
  }

  private async legacyRequest(id: number, message: Json, maxBytes: number): Promise<Json> {
    const legacy = this.legacy!;
    const reply = new Promise<Json>((resolve, reject) => {
      const timer = setTimeout(() => {
        legacy.pending.delete(id);
        reject(new McpError("timeout", "The server took too long to answer."));
      }, this.timeoutMs);
      legacy.pending.set(id, (msg) => {
        clearTimeout(timer);
        legacy.pending.delete(id);
        resolve(msg);
      });
    });
    const res = await this.post(legacy.endpoint, message, maxBytes);
    if (res.status >= 400) throw statusError(res.status);
    return reply;
  }

  close(): void {
    this.legacy?.abort.abort();
    this.legacy = null;
  }
}

export async function withMcpSession<T>(url: URL, auth: McpAuth, opts: McpClientOptions, fn: (s: McpSession) => Promise<T>): Promise<T> {
  const session = new McpSession(url, auth, opts);
  try {
    return await fn(session);
  } finally {
    session.close();
  }
}

/** initialize + tools/list, the handshake shown to the user before anything is saved. */
export async function inspectServer(url: URL, auth: McpAuth, opts: McpClientOptions = {}): Promise<McpServerInfo> {
  return withMcpSession(url, auth, opts, async (s) => {
    const info = await s.initialize();
    const tools = await s.listTools();
    return { ...info, tools };
  });
}
