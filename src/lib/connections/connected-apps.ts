/**
 * Connected Apps page model.
 *
 * One card per ACCOUNT (sign in once): the Google card lists Gmail, Calendar,
 * Drive, Sheets and Forms as covered; the Microsoft card lists Outlook mail +
 * calendar; the Meta card lists Pages, Lead Ads and Instagram. Each card shows
 * Connected / Needs reconnect / Not connected. The user's own MCP connectors
 * follow, visible only to that user. Custom connectors never count toward the
 * store number.
 */

import type { Connection } from "./types";
import { checkHealth, isBroken, type HealthDeps, type HealthState } from "./health";
import { appsForAccount, listStoreAccounts, type StoreAuthKind } from "./store";

export interface StoreCard {
  kind: "store";
  account: string;
  displayName: string;
  tagline: string;
  authKind: StoreAuthKind;
  /** Apps this one connection covers, by name. */
  covers: Array<{ slug: string; name: string }>;
  state: HealthState | "no_sign_in_needed";
  accountLabel: string | null;
  /** Fields to ask for when the app connects with a key instead of a sign-in page. */
  credentialFields: readonly string[];
}

export interface CustomCard {
  kind: "custom_mcp";
  id: string;
  slug: string;
  displayName: string;
  url: string;
  state: "connected" | "needs_reconnect";
  message: string | null;
  approvedTools: number;
  totalTools: number;
}

export interface ConnectedAppsDeps {
  listConnections(userId: string): Promise<Connection[]>;
  health?: HealthDeps;
  listCustom(userId: string): Promise<Array<{ id: string; slug: string; displayName: string; url: string; status: "connected" | "needs_reconnect"; message: string | null; tools: Array<{ approved?: boolean }> }>>;
}

/** Store accounts shown as cards (the generic CRM placeholder is not a usable store app). */
export function storeCardAccounts() {
  return listStoreAccounts().filter((a) => a.slug !== "crm");
}

/** True count of first-class store apps (usable by name in automations). Custom MCP connectors never count. */
export function storeAppCount(): number {
  return storeCardAccounts().reduce((n, a) => n + appsForAccount(a.slug).length, 0);
}

export async function listConnectedApps(
  deps: ConnectedAppsDeps,
  userId: string,
  opts: { check?: boolean } = {},
): Promise<{ store: StoreCard[]; custom: CustomCard[]; storeAppCount: number }> {
  const conns = await deps.listConnections(userId);
  const byAccount = new Map(conns.map((c) => [c.integration as string, c]));

  const store: StoreCard[] = [];
  for (const account of storeCardAccounts()) {
    const conn = byAccount.get(account.slug) ?? null;
    let state: StoreCard["state"];
    if (account.authKind === "no_auth") state = "no_sign_in_needed";
    else if (!conn || conn.status === "pending") state = "not_connected";
    else if (opts.check && deps.health) state = await checkHealth(deps.health, userId, account.slug);
    else state = isBroken(conn) ? "needs_reconnect" : "connected";
    store.push({
      kind: "store",
      account: account.slug,
      displayName: account.displayName,
      tagline: account.tagline,
      authKind: account.authKind,
      covers: appsForAccount(account.slug).map((a) => ({ slug: a.slug, name: a.displayName })),
      state,
      accountLabel: conn?.displayName ?? null,
      credentialFields: account.credentialFields ?? [],
    });
  }

  const custom: CustomCard[] = (await deps.listCustom(userId)).map((c) => ({
    kind: "custom_mcp",
    id: c.id,
    slug: c.slug,
    displayName: c.displayName,
    url: c.url,
    state: c.status,
    message: c.message,
    approvedTools: c.tools.filter((t) => t.approved).length,
    totalTools: c.tools.length,
  }));

  return { store, custom, storeAppCount: storeAppCount() };
}
