/**
 * Live wiring for token healing (server-side only).
 */

import { syncCredentialToN8n } from "@/lib/adapters/n8n/credentials/sync-service";
import { hasN8nConfigured, isSupabaseMode } from "@/lib/env";
import { updateLocalDatabase } from "@/lib/local-store";
import { getOAuthProvider, refreshConnection, validateConnection } from "@/lib/oauth";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { SupportedIntegration } from "@/lib/workflow";
import { ensureFresh, type FreshResult, type HealthDeps } from "./health";
import { getConnection, updateConnection } from "./repo";
import { markExpired } from "./service";

/** Plain note on the owner's usage/activity list. */
export async function ownerNote(userId: string, text: string): Promise<void> {
  if (isSupabaseMode()) {
    await createSupabaseAdminClient().from("usage_logs").insert({ user_id: userId, action: text, credits_used: 0, status: "Failed" });
    return;
  }
  await updateLocalDatabase((db) => {
    db.usageLogs.unshift({ id: crypto.randomUUID(), userId, action: text, creditsUsed: 0, status: "Failed", createdAt: new Date().toISOString() });
  });
}

export const liveHealthDeps: HealthDeps = {
  getConnection: (userId, account) => getConnection(userId, account as SupportedIntegration),
  async refresh(userId, account) {
    await refreshConnection({ userId, integration: account as SupportedIntegration });
  },
  async sync(userId, account) {
    if (!hasN8nConfigured()) return;
    await syncCredentialToN8n({ userId, integration: account as SupportedIntegration });
  },
  validate: (userId, account) => validateConnection({ userId, integration: account as SupportedIntegration }),
  async markBroken(userId, account, reason) {
    const integration = account as SupportedIntegration;
    const conn = await getConnection(userId, integration);
    // markExpired also pauses every automation that depends on this connection.
    await markExpired(userId, integration);
    await updateConnection(userId, integration, {
      metadata: { ...(conn?.metadata ?? {}), broken: { reason: reason.slice(0, 200), at: new Date().toISOString() } },
    });
  },
  note: ownerNote,
  supportsRefresh(account) {
    try {
      return getOAuthProvider(account).capabilities.supportsRefresh;
    } catch {
      return false;
    }
  },
  now: () => Date.now(),
};

export function ensureConnectionFresh(userId: string, app: string): Promise<FreshResult> {
  return ensureFresh(liveHealthDeps, userId, app);
}
