/**
 * Charging rules shared by routes:
 *
 *  - chargeForRun: reserve, run, then settle. A run that throws or does not
 *    finish successfully is refunded IN FULL (the legacy executor cannot say
 *    which steps completed). Insufficient credits never start the run and
 *    leave a plain note the owner can see.
 *  - chatChargeFor: the per-message chat fee. Messages handled by the agent
 *    (preview/draft) are free — the only charge on that journey is the build at
 *    confirm. The free test mode comes from env only and is off by default.
 */

import { getCreditService } from "./index";

export type ChargedRun<T> =
  | { ok: true; result: T; charged: number }
  | { ok: false; reason: "insufficient"; balance: number }
  | { ok: false; reason: "error" };

export async function chargeForRun<T>(input: {
  userId: string;
  amount: number;
  referenceId: string;
  description: string;
  automationName: string | null;
  run: () => Promise<T>;
  succeeded: (result: T) => boolean;
}): Promise<ChargedRun<T>> {
  const credits = getCreditService();
  const reservation = await credits.reserve({
    userId: input.userId,
    amount: input.amount,
    referenceId: input.referenceId,
    description: input.description,
  });
  if (!reservation.ok) {
    if (reservation.reason === "insufficient") {
      await credits.recordBlocked(input.userId, input.automationName);
      return { ok: false, reason: "insufficient", balance: reservation.balance };
    }
    return { ok: false, reason: "error" };
  }

  let result: T;
  try {
    result = await input.run();
  } catch (error) {
    await credits.refund({ userId: input.userId, referenceId: input.referenceId, description: `Refund: ${input.description} did not finish` });
    throw error;
  }
  if (!input.succeeded(result)) {
    await credits.refund({ userId: input.userId, referenceId: input.referenceId, description: `Refund: ${input.description} failed` });
    return { ok: true, result, charged: 0 };
  }
  await credits.settle({ userId: input.userId, referenceId: input.referenceId });
  return { ok: true, result, charged: reservation.charged };
}

export const CHAT_STANDARD_COST = 5;
export const CHAT_ULTRA_COST = 10;

/** Env-only switch, off by default, never on in production. */
export function chatFreeTestMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CHAT_FREE_TEST_MODE === "true" && env.NODE_ENV !== "production";
}

export function chatChargeFor(input: { isAgentMessage: boolean; ultraThinking: boolean; freeTestMode: boolean }): number {
  if (input.isAgentMessage || input.freeTestMode) return 0;
  return input.ultraThinking ? CHAT_ULTRA_COST : CHAT_STANDARD_COST;
}
