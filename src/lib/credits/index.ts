/**
 * The app-wide credit service. Picks the Supabase ledger when Supabase is
 * configured, otherwise the local file ledger. Server-side only.
 */

import { isSupabaseMode } from "@/lib/env";
import { localLedgerBackend } from "./local-backend";
import { CreditService } from "./service";
import { supabaseLedgerBackend } from "./supabase-backend";

export * from "./service";
export { ensureLocalCreditUser } from "./local-backend";

let instance: CreditService | null = null;
let instanceMode: boolean | null = null;

export function getCreditService(): CreditService {
  const supabase = isSupabaseMode();
  if (!instance || instanceMode !== supabase) {
    instance = new CreditService(supabase ? supabaseLedgerBackend : localLedgerBackend);
    instanceMode = supabase;
  }
  return instance;
}

/** Reference for one user action that has no natural id (an API call). */
export function actionReference(kind: string, idempotencyKey?: string | null): string {
  const key = idempotencyKey && /^[A-Za-z0-9_.:-]{8,120}$/.test(idempotencyKey) ? idempotencyKey : crypto.randomUUID();
  return `${kind}:${key}`;
}
