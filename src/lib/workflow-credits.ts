import { getUserCredits } from "@/lib/credit-store";
import { getCreditService } from "@/lib/credits";
import { createLogger } from "@/lib/logger";

const log = createLogger("workflow-credits");

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CreditCheckResult =
  | { allowed: true; cost: number; currentCredits: number }
  | { allowed: false; cost: number; currentCredits: number; error: string };

export type CreditDeductionResult = {
  success: boolean;
  cost: number;
  remainingCredits: number;
  transactionId: string | null;
  error?: string;
};

/* ------------------------------------------------------------------ */
/*  Cost calculation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Each workflow step costs 1 credit.
 */
export function calculateWorkflowCost(stepCount: number): number {
  return Math.max(0, stepCount);
}

/* ------------------------------------------------------------------ */
/*  Credit check                                                       */
/* ------------------------------------------------------------------ */

/**
 * Checks whether a user has enough credits to run a workflow with the
 * given number of steps.  Does NOT deduct anything.
 */
export async function checkCredits(
  userId: string,
  stepCount: number,
): Promise<CreditCheckResult> {
  const cost = calculateWorkflowCost(stepCount);

  log.info("Checking credits.", { userId, cost });

  const credits = await getUserCredits(userId);
  const currentCredits = credits.totalCredits;

  if (currentCredits < cost) {
    log.warn("Insufficient credits.", { userId, currentCredits, cost });
    return {
      allowed: false,
      cost,
      currentCredits,
      error: `Not enough credits. Required: ${cost}, available: ${currentCredits}.`,
    };
  }

  return { allowed: true, cost, currentCredits };
}

/* ------------------------------------------------------------------ */
/*  Deduction + transaction                                            */
/* ------------------------------------------------------------------ */

/**
 * Deducts credits for a workflow run and records a credit_transaction
 * with `type = "usage"` and the given `referenceId` (workflow run id).
 *
 * This function is idempotent per referenceId — if a transaction with
 * the same reference_id already exists, it will skip the deduction.
 */
export async function deductWorkflowCredits(input: {
  userId: string;
  cost: number;
  /** Run id (or another idempotency key). Required: every deduction carries a reference. */
  referenceId: string;
}): Promise<CreditDeductionResult> {
  const { userId, cost, referenceId } = input;
  log.info("Deducting workflow credits.", { userId, cost, referenceId });

  const credits = getCreditService();
  const actionDesc = `Workflow execution (${cost} step${cost === 1 ? "" : "s"})`;
  // One ledger row (type 'deduct', with this reference) written by the RPC itself.
  const r = await credits.reserve({ userId, amount: cost, referenceId, description: actionDesc, metadata: { kind: "run-workflow" } });
  const remainingCredits = await credits.balance(userId);

  if (!r.ok) {
    return {
      success: false,
      cost,
      remainingCredits,
      transactionId: null,
      error: r.reason === "insufficient" ? "Credit deduction failed. Insufficient balance." : "Credit deduction failed.",
    };
  }
  return { success: true, cost: r.charged, remainingCredits, transactionId: referenceId };
}
