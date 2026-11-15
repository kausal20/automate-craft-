/**
 * Local (non-Supabase) ledger — the same rules as the Supabase RPCs:
 * plan purse first on deduct, split recorded, one row per (reference, type),
 * balanceAfter tracked, refunds actually persisted.
 */

import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import type { CreditResult, DeductResult, LedgerBackend, LedgerRow, LedgerType } from "./service";

const WELCOME_CREDITS = 10;

/** Create the local user row on first use (mirrors the signup welcome grant). */
export async function ensureLocalCreditUser(userId: string): Promise<void> {
  if (userId === "guest-user") return;
  await updateLocalDatabase((database) => {
    if (database.users.some((u) => u.id === userId)) return;
    const now = new Date().toISOString();
    database.users.push({
      id: userId,
      email: `${userId}@supabase.local`,
      name: "Supabase User",
      passwordHash: "supabase-auth-managed",
      createdAt: now,
      planCredits: WELCOME_CREDITS,
      extraCredits: 0,
      onboarded: true,
    });
    database.creditTransactions.unshift({
      id: crypto.randomUUID(), userId, type: "grant", amount: WELCOME_CREDITS, balanceAfter: WELCOME_CREDITS,
      description: "Welcome bonus — 10 free credits", referenceId: `welcome:${userId}`, metadata: { plan_part: WELCOME_CREDITS, extra_part: 0 },
      createdAt: now,
    });
    database.usageLogs.unshift({
      id: crypto.randomUUID(), userId, action: "Welcome bonus - 10 free credits", creditsUsed: 0, status: "Success", createdAt: now,
    });
  });
}

export const localLedgerBackend: LedgerBackend = {
  name: "local",

  async balance(userId) {
    if (userId === "guest-user") return { plan: 10, extra: 0 };
    await ensureLocalCreditUser(userId);
    const db = await readLocalDatabase();
    const u = db.users.find((x) => x.id === userId);
    return { plan: u?.planCredits ?? 0, extra: u?.extraCredits ?? 0 };
  },

  async deduct({ userId, amount, referenceId, description, metadata }): Promise<DeductResult> {
    if (userId === "guest-user") return { status: "ok", planPart: 0, extraPart: 0, balanceAfter: 10 };
    await ensureLocalCreditUser(userId);
    return updateLocalDatabase((db): DeductResult => {
      if (db.creditTransactions.some((t) => t.referenceId === referenceId && t.type === "deduct")) return { status: "duplicate" };
      const u = db.users.find((x) => x.id === userId);
      if (!u) return { status: "error", message: "User not found" };
      const plan = u.planCredits ?? 0;
      const extra = u.extraCredits ?? 0;
      const now = new Date().toISOString();
      if (plan + extra < amount) {
        db.usageLogs.unshift({ id: crypto.randomUUID(), userId, action: description, creditsUsed: amount, status: "Failed", createdAt: now });
        return { status: "insufficient", balance: plan + extra };
      }
      const planPart = Math.min(plan, amount);
      const extraPart = amount - planPart;
      u.planCredits = plan - planPart;
      u.extraCredits = extra - extraPart;
      const balanceAfter = u.planCredits + u.extraCredits;
      db.creditTransactions.unshift({
        id: crypto.randomUUID(), userId, type: "deduct", amount, balanceAfter, description, referenceId,
        metadata: { ...metadata, plan_part: planPart, extra_part: extraPart }, createdAt: now,
      });
      db.usageLogs.unshift({ id: crypto.randomUUID(), userId, action: description, creditsUsed: amount, status: "Success", createdAt: now });
      return { status: "ok", planPart, extraPart, balanceAfter };
    });
  },

  async credit({ userId, amount, toPlan, referenceId, type, description, metadata }): Promise<CreditResult> {
    if (userId === "guest-user") return { status: "ok", balanceAfter: 10 };
    await ensureLocalCreditUser(userId);
    return updateLocalDatabase((db): CreditResult => {
      if (db.creditTransactions.some((t) => t.referenceId === referenceId && t.type === type)) return { status: "duplicate" };
      const u = db.users.find((x) => x.id === userId);
      if (!u) return { status: "error", message: "User not found" };
      if (toPlan < 0 || toPlan > amount) return { status: "error", message: "Invalid purse split" };
      u.planCredits = (u.planCredits ?? 0) + toPlan;
      u.extraCredits = (u.extraCredits ?? 0) + (amount - toPlan);
      const balanceAfter = u.planCredits + u.extraCredits;
      const now = new Date().toISOString();
      db.creditTransactions.unshift({
        id: crypto.randomUUID(), userId, type, amount, balanceAfter, description, referenceId,
        metadata: { ...metadata, plan_part: toPlan, extra_part: amount - toPlan }, createdAt: now,
      });
      db.usageLogs.unshift({ id: crypto.randomUUID(), userId, action: description, creditsUsed: 0, status: "Success", createdAt: now });
      return { status: "ok", balanceAfter };
    });
  },

  async find(referenceId: string, type: LedgerType): Promise<LedgerRow | null> {
    const db = await readLocalDatabase();
    const t = db.creditTransactions.find((x) => x.referenceId === referenceId && x.type === type);
    return t ? { userId: t.userId, type: t.type, amount: t.amount, metadata: t.metadata ?? {} } : null;
  },

  async logUsage(userId, action, status) {
    await updateLocalDatabase((db) => {
      db.usageLogs.unshift({ id: crypto.randomUUID(), userId, action, creditsUsed: 0, status, createdAt: new Date().toISOString() });
    });
  },
};
