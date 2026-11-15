/**
 * Credit reserve / settle / refund for execution runs — a thin layer over the
 * credit service, keyed by the run id.
 *
 *   reserveRunCredits — deduct the estimate up front (ledger row carries the run id,
 *                       written by the RPC in the same transaction; no post-hoc tagging).
 *   settleRunCredits  — on the run's final state: keep the cost of the steps that
 *                       actually completed, refund the rest to the same purses.
 *   refundRunCredits  — give the whole reservation back (e.g. the adapter never ran).
 *
 * All three are idempotent per run id at the database level (unique index on
 * reference_id + type), in Supabase and local mode alike.
 */

import { getCreditService } from "@/lib/credits";
import { createLogger } from "@/lib/logger";

const log = createLogger("execution/credits/reserver");

export type ReserveInput = {
  userId: string;
  amount: number;
  referenceId: string;
  description?: string;
  /** Cost of each step, so a failed run can settle only what completed. */
  perStep?: Record<string, number>;
};

export type ReserveResult =
  | { reserved: true; amount: number }
  | { reserved: false; reason: string };

export async function reserveRunCredits(input: ReserveInput): Promise<ReserveResult> {
  const r = await getCreditService().reserve({
    userId: input.userId,
    amount: input.amount,
    referenceId: input.referenceId,
    description: input.description ?? `Run reservation (${input.amount} credits)`,
    metadata: input.perStep ? { per_step: input.perStep } : {},
  });
  if (r.ok) return { reserved: true, amount: r.charged };
  return { reserved: false, reason: r.reason === "insufficient" ? "Insufficient balance." : "Could not reserve credits." };
}

export type RefundInput = {
  userId: string;
  amount: number;
  referenceId: string;
  description?: string;
};

export type RefundResult = {
  refunded: boolean;
  amount: number;
};

/** Full refund of the run's reservation, back to the purses it came from. */
export async function refundRunCredits(input: RefundInput): Promise<RefundResult> {
  if (input.amount <= 0) return { refunded: true, amount: 0 };
  const r = await getCreditService().refund({
    userId: input.userId,
    referenceId: input.referenceId,
    description: input.description ?? `Refund for ${input.referenceId}`,
  });
  if (r.ok) return { refunded: true, amount: r.refunded };
  if (r.reason === "no_reservation") return { refunded: true, amount: 0 };
  log.error("Refund failed.", { referenceId: input.referenceId });
  return { refunded: false, amount: 0 };
}

export type SettleInput = {
  /** Owner; defaults to the reservation's owner. */
  userId?: string;
  referenceId: string;
  /** Final run state. */
  succeeded: boolean;
  /**
   * Step ids that completed successfully. When known, a failed run keeps the
   * cost of exactly these steps (from the reservation's per-step costs) and
   * refunds the rest. When unknown, a failed run is refunded in full.
   */
  completedStepIds?: string[] | null;
};

export async function settleRunCredits(input: SettleInput): Promise<{ kept: number; refunded: number }> {
  const credits = getCreditService();
  const reservation = await credits.findReservation(input.referenceId);
  if (!reservation) return { kept: 0, refunded: 0 }; // nothing was charged for this run
  const userId = input.userId ?? reservation.userId;
  if (input.succeeded) {
    const r = await credits.settle({ userId, referenceId: input.referenceId });
    return { kept: r.ok ? r.kept ?? 0 : 0, refunded: 0 };
  }

  let completedAmount = 0;
  const perStep = (reservation?.metadata.per_step ?? null) as Record<string, number> | null;
  if (input.completedStepIds && perStep) {
    completedAmount = input.completedStepIds.reduce((sum, id) => sum + (Number(perStep[id]) || 0), 0);
  }
  const r = await credits.settle({
    userId,
    referenceId: input.referenceId,
    completedAmount,
    description: `Refund for failed run ${input.referenceId}`,
  });
  return { kept: r.ok ? r.kept ?? 0 : 0, refunded: r.ok ? r.refunded : 0 };
}
