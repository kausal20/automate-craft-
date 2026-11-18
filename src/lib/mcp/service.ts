/**
 * "Add your own connector" — a user's remote MCP server as a first-class,
 * PER-USER connection.
 *
 *   inspect  : validate link -> initialize -> tools/list. Shows name + tools. Saves NOTHING.
 *   add      : same handshake again, then save: display name, URL, vault secret
 *              reference, tools with schemas. Every tool starts OFF unless the user
 *              switched it on; tools whose schema we cannot validate stay off.
 *   callTool : only approved + supported tools, inputs validated against the saved
 *              schema, 30 s timeout, response size cap. Results are DATA.
 *   health / reconnect / setApproved / remove : same row, never a duplicate;
 *              remove pauses automations that use it and drops its catalogue actions.
 *
 * Secrets live only in the encrypted vault and are never returned or logged.
 * Remote links only: no local/stdio servers, no running user code.
 */

import type { CatalogueApp, CatalogueOperation } from "../agent/brain/catalogue";
import type { McpAuth, McpClientOptions, McpServerInfo } from "./client";
import { McpError, inspectServer, withMcpSession } from "./client";
import { isSchemaSupported, requiredInputs, validateInputs } from "./schema";
import { checkMcpUrl, type Resolver } from "./url-guard";

export const MAX_INPUT_BYTES = 64_000;

export interface ConnectorTool {
  name: string;
  /** Snake-case operation name used in plans. */
  operation: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Plan param name -> real input name (tool inputs may contain dashes etc). */
  inputMap: Record<string, string>;
  supported: boolean;
  approved: boolean;
}

export interface CustomConnector {
  id: string;
  userId: string;
  displayName: string;
  url: string;
  authType: McpAuth["type"];
  headerName: string | null;
  status: "connected" | "needs_reconnect";
  lastError: string | null;
  tools: ConnectorTool[];
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorRepo {
  create(c: CustomConnector): Promise<CustomConnector>;
  get(userId: string, id: string): Promise<CustomConnector | null>;
  list(userId: string): Promise<CustomConnector[]>;
  update(userId: string, id: string, patch: Partial<CustomConnector>): Promise<CustomConnector | null>;
  remove(userId: string, id: string): Promise<boolean>;
}

export interface SecretStore {
  put(userId: string, connectorId: string, auth: McpAuth): Promise<void>;
  get(userId: string, connectorId: string): Promise<McpAuth | null>;
  remove(userId: string, connectorId: string): Promise<void>;
}

export interface McpDeps {
  repo: ConnectorRepo;
  secrets: SecretStore;
  newId: () => string;
  /** Pause automations that use this connector (agent onConnectionLost). */
  onLost: (userId: string, slug: string) => Promise<unknown>;
  /** Plain owner note / activity entry. */
  record: (userId: string, automationId: string | null, text: string) => Promise<void>;
  resolver?: Resolver;
  allowPrivate?: boolean;
  client?: McpClientOptions;
  /** Test seam: replaces the network handshake. */
  inspect?: (url: URL, auth: McpAuth) => Promise<McpServerInfo>;
}

export class McpUserError extends Error {
  readonly plain: string;
  readonly status: number;
  constructor(plain: string, status = 400) {
    super(plain);
    this.name = "McpUserError";
    this.plain = plain;
    this.status = status;
  }
}

/* ── naming ───────────────────────────────────────────────────────── */

export function slugFor(connectorId: string): string {
  return `mcp_${connectorId.replace(/-/g, "").toLowerCase()}`;
}

export function connectorIdFromSlug(slug: string): string | null {
  const m = /^mcp_([0-9a-f]{32})$/.exec(slug);
  if (!m) return null;
  const h = m[1];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function snake(name: string, taken: Set<string>): string {
  let base = name.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "tool";
  if (!/^[a-z]/.test(base)) base = `t_${base}`;
  base = base.slice(0, 70);
  let out = base;
  for (let i = 2; taken.has(out); i++) out = `${base}_${i}`;
  taken.add(out);
  return out;
}

function toTools(info: McpServerInfo, approved: Set<string>, previous?: ConnectorTool[]): ConnectorTool[] {
  const taken = new Set<string>();
  return info.tools.map((t) => {
    const supported = isSchemaSupported(t.inputSchema);
    const inputMap: Record<string, string> = {};
    const usedParams = new Set<string>();
    for (const key of Object.keys((t.inputSchema.properties ?? {}) as Record<string, unknown>)) {
      inputMap[snake(key, usedParams)] = key;
    }
    const wasApproved = previous?.find((p) => p.name === t.name)?.approved ?? false;
    return {
      name: t.name,
      operation: snake(t.name, taken),
      description: t.description,
      inputSchema: t.inputSchema,
      inputMap,
      supported,
      approved: supported && (approved.has(t.name) || (previous !== undefined && wasApproved)),
    };
  });
}

function plainTool(t: { name: string; description: string; inputSchema: Record<string, unknown>; supported: boolean; approved?: boolean }) {
  const req = new Set(requiredInputs(t.inputSchema));
  return {
    name: t.name,
    description: t.description || "No description given by the server.",
    inputs: Object.keys((t.inputSchema.properties ?? {}) as Record<string, unknown>).map((k) => ({ name: k, required: req.has(k) })),
    supported: t.supported,
    note: t.supported ? null : "This tool's inputs can't be checked safely, so it stays switched off.",
    ...(t.approved === undefined ? {} : { approved: t.approved }),
  };
}

export type ConnectorView = ReturnType<McpConnectorService["view"]>;

export class McpConnectorService {
  private readonly d: McpDeps;
  constructor(deps: McpDeps) {
    this.d = deps;
  }

  private async handshake(rawUrl: string, auth: McpAuth): Promise<{ url: URL; info: McpServerInfo }> {
    const checked = await checkMcpUrl(rawUrl, { resolver: this.d.resolver, allowPrivate: this.d.allowPrivate });
    if (!checked.ok) throw new McpUserError(checked.message);
    try {
      const info = this.d.inspect ? await this.d.inspect(checked.url, auth) : await inspectServer(checked.url, auth, this.d.client);
      return { url: checked.url, info };
    } catch (error) {
      if (error instanceof McpError) throw new McpUserError(error.plain, 422);
      throw new McpUserError("We couldn't talk to that server. Nothing was saved.", 422);
    }
  }

  view(c: CustomConnector) {
    return {
      id: c.id,
      slug: slugFor(c.id),
      displayName: c.displayName,
      url: c.url,
      authType: c.authType,
      status: c.status,
      message: c.status === "connected" ? null : (c.lastError ?? "This connector needs attention."),
      tools: c.tools.map((t) => plainTool(t)),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async inspect(input: { url: string; auth: McpAuth }) {
    const { url, info } = await this.handshake(input.url, input.auth);
    return {
      serverName: info.name,
      url: url.toString(),
      tools: info.tools.map((t) => plainTool({ ...t, supported: isSchemaSupported(t.inputSchema) })),
    };
  }

  async add(userId: string, input: { url: string; auth: McpAuth; displayName?: string; approvedTools: string[] }) {
    const { url, info } = await this.handshake(input.url, input.auth);
    const at = new Date().toISOString();
    const id = this.d.newId();
    const connector: CustomConnector = {
      id,
      userId,
      displayName: (input.displayName?.trim() || info.name).slice(0, 80),
      url: url.toString(),
      authType: input.auth.type,
      headerName: input.auth.type === "header" ? input.auth.headerName : null,
      status: "connected",
      lastError: null,
      tools: toTools(info, new Set(input.approvedTools)),
      createdAt: at,
      updatedAt: at,
    };
    await this.d.secrets.put(userId, id, input.auth);
    try {
      await this.d.repo.create(connector);
    } catch (error) {
      await this.d.secrets.remove(userId, id).catch(() => undefined);
      throw error;
    }
    return this.view(connector);
  }

  async list(userId: string) {
    return (await this.d.repo.list(userId)).map((c) => this.view(c));
  }

  private async mustGet(userId: string, id: string): Promise<CustomConnector> {
    const c = await this.d.repo.get(userId, id);
    if (!c) throw new McpUserError("We couldn't find that connector.", 404);
    return c;
  }

  async setApproved(userId: string, id: string, approvedTools: string[]) {
    const c = await this.mustGet(userId, id);
    const on = new Set(approvedTools);
    const tools = c.tools.map((t) => ({ ...t, approved: t.supported && on.has(t.name) }));
    return this.view((await this.d.repo.update(userId, id, { tools, displayName: c.displayName }))!);
  }

  async rename(userId: string, id: string, displayName: string) {
    await this.mustGet(userId, id);
    return this.view((await this.d.repo.update(userId, id, { displayName: displayName.trim().slice(0, 80) }))!);
  }

  /** Re-enter the credential on the SAME row; approvals are kept for tools that still exist. */
  async reconnect(userId: string, id: string, auth: McpAuth) {
    const c = await this.mustGet(userId, id);
    const { info } = await this.handshake(c.url, auth);
    await this.d.secrets.put(userId, id, auth);
    const updated = await this.d.repo.update(userId, id, {
      authType: auth.type,
      headerName: auth.type === "header" ? auth.headerName : null,
      status: "connected",
      lastError: null,
      tools: toTools(info, new Set(), c.tools),
    });
    return this.view(updated!);
  }

  /** Health check = tools/list again. */
  async health(userId: string, id: string) {
    const c = await this.mustGet(userId, id);
    const auth = (await this.d.secrets.get(userId, id)) ?? { type: "none" as const };
    try {
      const info = this.d.inspect ? await this.d.inspect(new URL(c.url), auth) : await inspectServer(new URL(c.url), auth, this.d.client);
      const updated = await this.d.repo.update(userId, id, { status: "connected", lastError: null, tools: toTools(info, new Set(), c.tools) });
      return this.view(updated!);
    } catch (error) {
      const plain = error instanceof McpError ? error.plain : "We couldn't reach this server.";
      const message = `Your “${c.displayName}” connector stopped working: ${plain} Tap to reconnect.`;
      if (c.status === "connected") {
        await this.d.onLost(userId, slugFor(id));
        await this.d.record(userId, null, message);
      }
      return this.view((await this.d.repo.update(userId, id, { status: "needs_reconnect", lastError: message }))!);
    }
  }

  async remove(userId: string, id: string) {
    const c = await this.mustGet(userId, id);
    await this.d.onLost(userId, slugFor(id));
    await this.d.repo.remove(userId, id);
    await this.d.secrets.remove(userId, id);
    await this.d.record(userId, null, `Removed your “${c.displayName}” connector. Automations that used it are paused.`);
    return { removed: true };
  }

  /** This user's approved, safely-callable tools as catalogue apps. Never another user's. */
  async catalogueApps(userId: string): Promise<CatalogueApp[]> {
    return (await this.d.repo.list(userId))
      .filter((c) => c.status === "connected")
      .map((c) => ({
        slug: slugFor(c.id),
        label: c.displayName,
        triggerKinds: [],
        operations: c.tools
          .filter((t) => t.approved && t.supported)
          .map((t): CatalogueOperation => ({
            operation: t.operation,
            kinds: ["action"],
            requiredParams: requiredInputs(t.inputSchema).map((r) => Object.entries(t.inputMap).find(([, v]) => v === r)?.[0] ?? r),
            description: t.description,
            untrusted: true,
          })),
      }))
      .filter((app) => app.operations.length > 0);
  }

  /** For plan lowering: app slug + operation -> connector + real tool. Owner-scoped. */
  async resolve(userId: string, slug: string, operation: string): Promise<{ connectorId: string; tool: ConnectorTool } | null> {
    const id = connectorIdFromSlug(slug);
    if (!id) return null;
    const c = await this.d.repo.get(userId, id);
    const tool = c?.tools.find((t) => t.operation === operation && t.approved && t.supported);
    return c && tool ? { connectorId: c.id, tool } : null;
  }

  /**
   * Call one approved tool. The result is DATA from an untrusted server: it is
   * returned as-is and never alters any plan, other step or system behaviour.
   */
  async callTool(
    userId: string,
    connectorId: string,
    toolName: string,
    inputs: unknown,
    automationId: string | null = null,
  ): Promise<{ ok: true; result: unknown } | { ok: false; message: string }> {
    const c = await this.d.repo.get(userId, connectorId);
    if (!c) return { ok: false, message: "That connector no longer exists." };
    const tool = c.tools.find((t) => t.name === toolName);
    if (!tool || !tool.approved || !tool.supported) return { ok: false, message: `The tool “${toolName}” is not switched on for this connector.` };
    if (c.status !== "connected") return { ok: false, message: `Your “${c.displayName}” connector needs to be reconnected first.` };

    const json = JSON.stringify(inputs ?? {});
    if (json.length > MAX_INPUT_BYTES) return { ok: false, message: "The inputs for this step are too large." };
    const problems = validateInputs(tool.inputSchema, inputs ?? {});
    if (problems.length > 0) return { ok: false, message: `The inputs for “${toolName}” aren't right: ${problems.slice(0, 3).join("; ")}.` };

    const auth = (await this.d.secrets.get(userId, connectorId)) ?? { type: "none" as const };
    try {
      const out = await withMcpSession(new URL(c.url), auth, { timeoutMs: 30_000, ...this.d.client }, async (s) => {
        await s.initialize();
        return s.callTool(tool.name, inputs as Record<string, unknown>);
      });
      if (out.isError) {
        await this.d.record(userId, automationId, `“${c.displayName}” → ${tool.name}: the tool reported a problem.`);
        return { ok: false, message: `“${tool.name}” reported a problem and didn't finish.` };
      }
      await this.d.record(userId, automationId, `“${c.displayName}” → ${tool.name}: done.`);
      return { ok: true, result: out.content };
    } catch (error) {
      const plain = error instanceof McpError ? error.plain : "We couldn't reach the server.";
      await this.d.record(userId, automationId, `“${c.displayName}” → ${tool.name}: failed. ${plain}`);
      return { ok: false, message: `“${tool.name}” didn't run: ${plain}` };
    }
  }
}
