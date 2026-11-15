/**
 * The agent's CreditLedger port, backed by the one credit service.
 * Reserve at confirm (reference = agent-build:<automationId>:<attempt>),
 * settle on a passing test run, refund (to the same purses) on any failure.
 */

import type { CreditService } from "@/lib/credits/service";
import type { CreditLedger } from "./types";

export function creditLedgerFrom(service: CreditService): CreditLedger {
  return {
    balance: (userId) => service.balance(userId),
    async reserve(input) {
      const r = await service.reserve(input);
      if (r.ok) return { ok: true };
      return { ok: false, reason: r.reason === "insufficient" ? "insufficient" : "error" };
    },
    async settle(input) {
      await service.settle({ userId: input.userId, referenceId: input.referenceId });
    },
    async refund(input) {
      const r = await service.refund({ userId: input.userId, referenceId: input.referenceId, description: input.description });
      return r.ok || r.reason === "no_reservation";
    },
  };
}
