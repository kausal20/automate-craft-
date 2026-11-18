/**
 * Live wiring for custom MCP connectors (server-side only).
 *
 * Storage: Supabase table `custom_mcp_connectors` (always filtered by user_id),
 * or the local store in local mode. Secrets: the encrypted credentials vault
 * (integration "custom_mcp", name = connector id).
 */

import { deleteCredential, getCredential, putCredential } from "@/lib/credentials";
import { ownerNote } from "@/lib/connections/health-live";
import { isSupabaseMode } from "@/lib/env";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { McpAuth } from "./client";
import { McpConnectorService, type ConnectorRepo, type CustomConnector, type SecretStore } from "./service";

export * from "./service";
export { checkMcpUrl } from "./url-guard";
export { signToolCall, verifyToolCall } from "./signing";

type Row = Record<string, unknown>;

const toRow = (c: Partial<CustomConnector>): Row => {
  const r: Row = {};
  if (c.id !== undefined) r.id = c.id;
  if (c.userId !== undefined) r.user_id = c.userId;
  if (c.displayName !== undefined) r.display_name = c.displayName;
  if (c.url !== undefined) r.url = c.url;
  if (c.authType !== undefined) r.auth_type = c.authType;
  if (c.headerName !== undefined) r.header_name = c.headerName;
  if (c.status !== undefined) r.status = c.status;
  if (c.lastError !== undefined) r.last_error = c.lastError;
  if (c.tools !== undefined) r.tools = c.tools;
  return r;
};

const fromRow = (r: Row): CustomConnector => ({
  id: r.id as string,
  userId: r.user_id as string,
  displayName: r.display_name as string,
  url: r.url as string,
  authType: (r.auth_type as CustomConnector["authType"]) ?? "none",
  headerName: (r.header_name as string | null) ?? null,
  status: (r.status as CustomConnector["status"]) ?? "connected",
  lastError: (r.last_error as string | null) ?? null,
  tools: (r.tools as CustomConnector["tools"]) ?? [],
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

const supabaseRepo: ConnectorRepo = {
  async create(c) {
    const { data, error } = await createSupabaseAdminClient().from("custom_mcp_connectors").insert(toRow(c)).select("*").single();
    if (error) throw new Error(error.message);
    return fromRow(data as Row);
  },
  async get(userId, id) {
    const { data, error } = await createSupabaseAdminClient().from("custom_mcp_connectors").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data as Row) : null;
  },
  async list(userId) {
    const { data, error } = await createSupabaseAdminClient().from("custom_mcp_connectors").select("*").eq("user_id", userId).order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => fromRow(r as Row));
  },
  async update(userId, id, patch) {
    const row: Row = { ...toRow(patch), updated_at: new Date().toISOString() };
    delete row.id;
    delete row.user_id;
    const { data, error } = await createSupabaseAdminClient().from("custom_mcp_connectors").update(row).eq("id", id).eq("user_id", userId).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data as Row) : null;
  },
  async remove(userId, id) {
    const { error, count } = await createSupabaseAdminClient().from("custom_mcp_connectors").delete({ count: "exact" }).eq("id", id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  },
};

const localRepo: ConnectorRepo = {
  async create(c) {
    await updateLocalDatabase((db) => {
      db.customMcpConnectors.push({ ...c });
    });
    return c;
  },
  async get(userId, id) {
    const db = await readLocalDatabase();
    const c = db.customMcpConnectors.find((x) => x.id === id && x.userId === userId);
    return c ? (structuredClone(c) as unknown as CustomConnector) : null;
  },
  async list(userId) {
    const db = await readLocalDatabase();
    return db.customMcpConnectors.filter((x) => x.userId === userId).map((c) => structuredClone(c) as unknown as CustomConnector);
  },
  async update(userId, id, patch) {
    return updateLocalDatabase((db) => {
      const c = db.customMcpConnectors.find((x) => x.id === id && x.userId === userId);
      if (!c) return null;
      Object.assign(c, patch, { id: c.id, userId: c.userId, updatedAt: new Date().toISOString() });
      return structuredClone(c) as unknown as CustomConnector;
    });
  },
  async remove(userId, id) {
    return updateLocalDatabase((db) => {
      const before = db.customMcpConnectors.length;
      db.customMcpConnectors = db.customMcpConnectors.filter((x) => !(x.id === id && x.userId === userId));
      return db.customMcpConnectors.length < before;
    });
  },
};

export const vaultSecrets: SecretStore = {
  async put(userId, connectorId, auth) {
    await putCredential({ userId, integration: "custom_mcp", name: connectorId, payload: { ...auth } as Record<string, unknown> });
  },
  async get(userId, connectorId) {
    const cred = await getCredential({ userId, integration: "custom_mcp", name: connectorId });
    return cred ? (cred.payload as unknown as McpAuth) : null;
  },
  async remove(userId, connectorId) {
    await deleteCredential({ userId, integration: "custom_mcp", name: connectorId });
  },
};

let instance: McpConnectorService | null = null;

export function getMcpService(): McpConnectorService {
  if (instance) return instance;
  instance = new McpConnectorService({
    repo: isSupabaseMode() ? supabaseRepo : localRepo,
    secrets: vaultSecrets,
    newId: () => crypto.randomUUID(),
    onLost: async (userId, slug) => {
      const { onConnectionLost } = await import("@/lib/agent/production");
      return onConnectionLost(userId, slug);
    },
    record: async (userId, automationId, text) => {
      if (automationId && isSupabaseMode()) {
        const { error } = await createSupabaseAdminClient()
          .from("agent_activity")
          .insert({ user_id: userId, automation_id: automationId, kind: "tool_call", message: text });
        if (!error) return;
      }
      await ownerNote(userId, text);
    },
  });
  return instance;
}
