/**
 * Token healing — keeps "connect once" true.
 *
 *  - ensureFresh: before the agent or a run uses a stored OAuth connection, if
 *    the access token expires within 10 minutes (or already has), refresh it
 *    through refreshConnection (vault updated in place) and re-sync the SAME
 *    n8n credential. The user is never asked.
 *  - When refresh fails (revoked, refresh token expired, provider error): mark
 *    the connection broken, stop using it, pause its automations (via the
 *    existing markExpired hook) and leave ONE plain note for the owner
 *    ("Your Gmail connection broke — tap to reconnect"). No silent retry loop.
 *  - checkHealth: Connected / Needs reconnect without running an automation.
 *  - Reconnect = the same OAuth flow for the same account; completeConnection
 *    writes the same row, vault credential name and n8n credential id.
 *
 * No scheduler here: Watchdog will call these paths later.
 */

import type { Connection } from "./types";
import { accountFor, storeAccount, storeApp } from "./store";

export const REFRESH_WINDOW_MS = 10 * 60 * 1000;

export type HealthState = "connected" | "needs_reconnect" | "not_connected";

export interface HealthDeps {
  getConnection(userId: string, account: string): Promise<Connection | null>;
  /** refreshConnection: refreshes and writes the vault credential in place. */
  refresh(userId: string, account: string): Promise<void>;
  /** Re-sync the account's existing n8n credential (no-op when n8n is not configured). */
  sync(userId: string, account: string): Promise<void>;
  validate(userId: string, account: string): Promise<{ ok: boolean; reason?: string }>;
  /** Mark expired + broken metadata; pauses dependent automations. */
  markBroken(userId: string, account: string, reason: string): Promise<void>;
  /** Owner-visible plain note. */
  note(userId: string, text: string): Promise<void>;
  supportsRefresh(account: string): boolean;
  now(): number;
}

export type FreshResult =
  | { ok: true; refreshed: boolean }
  | { ok: false; state: "not_connected" | "needs_reconnect"; message: string };

function label(appOrAccount: string): string {
  return storeApp(appOrAccount)?.displayName ?? storeAccount(appOrAccount)?.displayName ?? appOrAccount;
}

export function brokenMessage(appOrAccount: string): string {
  return `Your ${label(appOrAccount)} connection broke — tap to reconnect. Automations that use it are paused until then.`;
}

export function isBroken(conn: Connection | null): boolean {
  if (!conn) return false;
  return conn.status !== "connected" || Boolean((conn.metadata as { broken?: unknown }).broken);
}

/** Make sure the connection behind `app` is usable right now, refreshing silently if needed. */
export async function ensureFresh(deps: HealthDeps, userId: string, app: string): Promise<FreshResult> {
  const account = accountFor(app);
  if (storeAccount(account)?.authKind === "no_auth") return { ok: true, refreshed: false };

  const conn = await deps.getConnection(userId, account);
  if (!conn || conn.status === "pending") {
    return { ok: false, state: "not_connected", message: `Connect ${label(app)} first. You only do it once.` };
  }
  if (isBroken(conn)) return { ok: false, state: "needs_reconnect", message: brokenMessage(app) };

  const expiresAt = conn.expiresAt ? Date.parse(conn.expiresAt) : NaN;
  const dueSoon = Number.isFinite(expiresAt) && expiresAt - deps.now() <= REFRESH_WINDOW_MS;
  if (!dueSoon || storeAccount(account)?.authKind !== "oauth2") return { ok: true, refreshed: false };

  if (!deps.supportsRefresh(account)) {
    await deps.markBroken(userId, account, "token expired and this app has no refresh");
    await deps.note(userId, brokenMessage(app));
    return { ok: false, state: "needs_reconnect", message: brokenMessage(app) };
  }

  try {
    await deps.refresh(userId, account);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await deps.markBroken(userId, account, reason);
    await deps.note(userId, brokenMessage(app));
    return { ok: false, state: "needs_reconnect", message: brokenMessage(app) };
  }
  try {
    await deps.sync(userId, account);
  } catch {
    // n8n refreshes its own copy from the refresh token; a failed re-sync does not break the connection.
  }
  return { ok: true, refreshed: true };
}

/** Connected / Needs reconnect / Not connected for one account, checked live. */
export async function checkHealth(deps: HealthDeps, userId: string, account: string): Promise<HealthState> {
  const conn = await deps.getConnection(userId, account);
  if (!conn || conn.status === "pending") return "not_connected";
  if (isBroken(conn)) return "needs_reconnect";
  const fresh = await ensureFresh(deps, userId, account);
  if (!fresh.ok) return fresh.state === "not_connected" ? "not_connected" : "needs_reconnect";
  const v = await deps.validate(userId, account).catch(() => ({ ok: false, reason: "check failed" }));
  if (v.ok) return "connected";
  await deps.markBroken(userId, account, v.reason ?? "check failed");
  await deps.note(userId, brokenMessage(account));
  return "needs_reconnect";
}
