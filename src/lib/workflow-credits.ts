import { getUserCredits, deductCredits } from "@/lib/credit-store";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { updateLocalDatabase } from "@/lib/local-store";
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
  referenceId: string | null;
}): Promise<CreditDeductionResult> {
  const { userId, cost, referenceId } = input;

  log.info("Deducting workflow credits.", { userId, cost, referenceId });

  // --- Guard: skip zero-cost workflows ---
  if (cost <= 0) {
    const credits = await getUserCredits(userId);
    return {
      success: true,
      cost: 0,
      remainingCredits: credits.totalCredits,
      transactionId: null,
    };
  }

  // --- Idempotency check (Supabase only) ---
  if (isSupabaseMode() && referenceId) {
    const supabase = createSupabaseAdminClient();
    const { data: existing } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("reference_id", referenceId)
      .eq("type", "usage")
      .maybeSingle();

    if (existing) {
      log.info("Deduction already recorded for this run. Skipping.", { referenceId });
      const credits = await getUserCredits(userId);
      return {
        success: true,
        cost,
        remainingCredits: credits.totalCredits,
        transactionId: existing.id as string,
      };
    }
  }

  // --- Deduct using the existing atomic mechanism ---
  const actionDesc = `Workflow execution (${cost} step${cost === 1 ? "" : "s"})`;
  const deducted = await deductCredits(userId, cost, actionDesc);

  if (!deducted) {
    const credits = await getUserCredits(userId);
    return {
      success: false,
      cost,
      remainingCredits: credits.totalCredits,
      transactionId: null,
      error: "Credit deduction failed. Insufficient balance.",
    };
  }

  // --- Record the transaction with reference_id ---
  let transactionId: string | null = null;

  if (isSupabaseMode() && referenceId) {
    try {
      const supabase = createSupabaseAdminClient();
      const credits = await getUserCredits(userId);

      const { data: txn } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: userId,
          type: "usage",
          amount: -cost,
          balance_after: credits.totalCredits,
          description: actionDesc,
          reference_id: referenceId,
        })
        .select("id")
        .single();

      transactionId = (txn?.id as string) ?? null;
    } catch (txnError) {
      log.warn("Could not record credit transaction.", txnError);
    }
  } else if (!isSupabaseMode() && referenceId) {
    // Local mode: store in usageLogs (already handled by deductCredits)
    // Just capture the reference for the response
    try {
      await updateLocalDatabase((database) => {
        const latestLog = database.usageLogs.find(
          (entry) => entry.userId === userId && entry.action === actionDesc,
        );
        if (latestLog) {
          transactionId = latestLog.id;
        }
      });
    } catch {
      // Non-critical
    }
  }

  const creditsAfter = await getUserCredits(userId);

  log.info("Credits deducted successfully.", {
    userId,
    cost,
    remaining: creditsAfter.totalCredits,
    transactionId,
  });

  return {
    success: true,
    cost,
    remainingCredits: creditsAfter.totalCredits,
    transactionId,
  };
}
