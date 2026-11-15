/**
 * The one credit service. Every grant, deduction and refund in the app goes
 * through here, and every movement carries a reference_id:
 *
 *   check   — can this user afford `amount`?
 *   reserve — deduct up front (plan purse first, then extra). Idempotent per reference.
 *   settle  — keep what was actually used; refund the rest to the same purses.
 *   refund  — give a reservation back (full, or a part), to the purse(s) it came from.
 *   grant   — add credits (subscription/grant -> plan purse; purchase/bonus -> extra purse).
 *
 * The storage (Supabase RPCs or the local file store) sits behind
 * `LedgerBackend`. "Already exists" for a reference is success, never an error.
 */

import { createLogger } from "@/lib/logger";

const log = createLogger("credits/service");

export type GrantKind = "purchase" | "subscription" | "grant" | "bonus" | "adjustment";
export type LedgerType = "deduct" | "refund" | GrantKind;

export type DeductResult =
  | { status: "ok"; planPart: number; extraPart: number; balanceAfter: number }
  | { status: "duplicate" }
  | { status: "insufficient"; balance: number }
  | { status: "error"; message: string };

export type CreditResult =
  | { status: "ok"; balanceAfter: number }
  | { status: "duplicate" }
  | { status: "error"; message: string };

export interface LedgerRow {
  userId: string;
  type: string;
  amount: number;
  metadata: Record<string, unknown>;
}

export interface LedgerBackend {
  balance(userId: string): Promise<{ plan: number; extra: number }>;
  deduct(input: { userId: string; amount: number; referenceId: string; description: string; metadata: Record<string, unknown> }): Promise<DeductResult>;
  credit(input: {
    userId: string;
    amount: number;
    /** Part that goes to plan_credits; the rest goes to extra_credits. */
    toPlan: number;
    referenceId: string;
    type: "refund" | GrantKind;
    description: string;
    metadata: Record<string, unknown>;
  }): Promise<CreditResult>;
  find(referenceId: string, type: LedgerType): Promise<LedgerRow | null>;
  /** Owner-visible usage entry (plain language). */
  logUsage(userId: string, action: string, status: "Success" | "Failed"): Promise<void>;
  /** True when this backend cannot know the purse split for old rows (local legacy data). */
  readonly name: string;
}

export type ReserveOutcome =
  | { ok: true; charged: number; alreadyReserved: boolean }
  | { ok: false; reason: "insufficient"; balance: number }
  | { ok: false; reason: "error" };

export type RefundOutcome =
  | { ok: true; refunded: number; alreadyRefunded: boolean }
  | { ok: false; reason: "no_reservation" | "error" };

export type GrantOutcome = { ok: true; alreadyGranted: boolean } | { ok: false; reason: "error" };

export type CreditState = "ok" | "low" | "empty";

/** low = 20% or less of the monthly grant left, or under 100 credits; empty = nothing left. */
export function creditState(balance: number, monthlyGrant: number): CreditState {
  if (balance <= 0) return "empty";
  if (balance < 100) return "low";
  if (monthlyGrant > 0 && balance <= monthlyGrant * 0.2) return "low";
  return "ok";
}

export function usagePercent(monthlyUsage: number, monthlyGrant: number): number {
  if (monthlyGrant <= 0) return 0;
  return Math.min(100, Math.round((monthlyUsage / monthlyGrant) * 1000) / 10);
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export class CreditService {
  private readonly backend: LedgerBackend;
  constructor(backend: LedgerBackend) {
    this.backend = backend;
  }

  async balance(userId: string): Promise<number> {
    const b = await this.backend.balance(userId);
    return b.plan + b.extra;
  }

  async check(userId: string, amount: number): Promise<{ allowed: boolean; balance: number }> {
    const balance = await this.balance(userId);
    return { allowed: balance >= amount, balance };
  }

  async reserve(input: {
    userId: string;
    amount: number;
    referenceId: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<ReserveOutcome> {
    if (!input.referenceId) throw new Error("reserve() needs a referenceId");
    if (input.amount <= 0) return { ok: true, charged: 0, alreadyReserved: false };
    const r = await this.backend.deduct({ ...input, metadata: input.metadata ?? {} });
    switch (r.status) {
      case "ok":
        return { ok: true, charged: input.amount, alreadyReserved: false };
      case "duplicate": {
        const row = await this.backend.find(input.referenceId, "deduct");
        return { ok: true, charged: row ? num(row.amount) : input.amount, alreadyReserved: true };
      }
      case "insufficient":
        return { ok: false, reason: "insufficient", balance: r.balance };
      default:
        log.error("Credit reserve failed.", { referenceId: input.referenceId, message: r.message });
        return { ok: false, reason: "error" };
    }
  }

  /**
   * Refund a reservation. Without `amount`: the whole reservation, back to the
   * exact purses it came from. With `amount`: that part, taken back in reverse
   * order (extra purse first, since it was charged last), then plan purse.
   */
  async refund(input: { userId: string; referenceId: string; amount?: number; description: string }): Promise<RefundOutcome> {
    const row = await this.backend.find(input.referenceId, "deduct");
    if (!row) return { ok: false, reason: "no_reservation" };
    if (row.userId !== input.userId) {
      log.error("Refund refused: reservation belongs to another user.", { referenceId: input.referenceId });
      return { ok: false, reason: "no_reservation" };
    }
    const reserved = num(row.amount);
    const amount = Math.min(reserved, input.amount ?? reserved);
    if (amount <= 0) return { ok: true, refunded: 0, alreadyRefunded: false };

    let planPart = num(row.metadata.plan_part);
    let extraPart = num(row.metadata.extra_part);
    if (row.metadata.plan_part === undefined && row.metadata.extra_part === undefined) {
      log.warn("Purse split unknown for reservation; refunding to extra credits.", { referenceId: input.referenceId });
      planPart = 0;
      extraPart = reserved;
    }
    const toExtra = Math.min(extraPart, amount);
    const toPlan = Math.min(planPart, amount - toExtra);

    const r = await this.backend.credit({
      userId: input.userId,
      amount,
      toPlan,
      referenceId: input.referenceId,
      type: "refund",
      description: input.description,
      metadata: { reserved },
    });
    if (r.status === "ok") return { ok: true, refunded: amount, alreadyRefunded: false };
    if (r.status === "duplicate") return { ok: true, refunded: 0, alreadyRefunded: true };
    log.error("Credit refund failed.", { referenceId: input.referenceId, message: r.message });
    return { ok: false, reason: "error" };
  }

  /** Keep `completedAmount` (default: all of it), refund the rest. */
  async settle(input: { userId: string; referenceId: string; completedAmount?: number; description?: string }): Promise<RefundOutcome & { kept?: number }> {
    const row = await this.backend.find(input.referenceId, "deduct");
    if (!row) return { ok: true, refunded: 0, alreadyRefunded: false, kept: 0 };
    const reserved = num(row.amount);
    const kept = input.completedAmount === undefined ? reserved : Math.max(0, Math.min(reserved, input.completedAmount));
    if (kept >= reserved) return { ok: true, refunded: 0, alreadyRefunded: false, kept };
    const r = await this.refund({
      userId: input.userId,
      referenceId: input.referenceId,
      amount: reserved - kept,
      description: input.description ?? `Refund of unused credits for ${input.referenceId}`,
    });
    return { ...r, kept };
  }

  async grant(input: {
    userId: string;
    amount: number;
    kind: GrantKind;
    referenceId: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<GrantOutcome> {
    if (!input.referenceId) throw new Error("grant() needs a referenceId");
    if (input.amount <= 0) return { ok: true, alreadyGranted: false };
    const toPlan = input.kind === "subscription" || input.kind === "grant" ? input.amount : 0;
    const r = await this.backend.credit({
      userId: input.userId,
      amount: input.amount,
      toPlan,
      referenceId: input.referenceId,
      type: input.kind,
      description: input.description,
      metadata: input.metadata ?? {},
    });
    if (r.status === "ok") return { ok: true, alreadyGranted: false };
    if (r.status === "duplicate") return { ok: true, alreadyGranted: true };
    log.error("Credit grant failed.", { referenceId: input.referenceId, message: r.message });
    return { ok: false, reason: "error" };
  }

  /** The deduct row for a reference (amount, owner, purse split, per-step costs), or null. */
  async findReservation(referenceId: string): Promise<LedgerRow | null> {
    return this.backend.find(referenceId, "deduct");
  }

  async isGranted(referenceId: string, kind: GrantKind): Promise<boolean> {
    return (await this.backend.find(referenceId, kind)) !== null;
  }

  /** Owner-visible note when an automation could not run because credits ran out. */
  async recordBlocked(userId: string, automationName: string | null): Promise<void> {
    const name = automationName ? `“${automationName}”` : "Your automation";
    await this.backend.logUsage(
      userId,
      `${name} stopped because you ran out of credits. Add credits to start it again.`,
      "Failed",
    );
  }
}
