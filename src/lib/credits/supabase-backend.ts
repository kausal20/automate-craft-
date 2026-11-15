/**
 * Supabase ledger — thin wrapper over the atomic RPCs from
 * 20260614_credit_ledger.sql. The RPC writes the one ledger row per movement,
 * with its reference_id, inside the same transaction as the balance change.
 */

import { createSupabaseAdminClient } from "@/lib/supabase";
import type { CreditResult, DeductResult, LedgerBackend, LedgerRow, LedgerType } from "./service";

type RpcResult = {
  success?: boolean;
  duplicate?: boolean;
  error?: string;
  balance?: number;
  plan_part?: number;
  extra_part?: number;
  total_credits?: number;
};

export const supabaseLedgerBackend: LedgerBackend = {
  name: "supabase",

  async balance(userId) {
    const { data, error } = await createSupabaseAdminClient()
      .from("profiles")
      .select("plan_credits, extra_credits")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { plan: Number(data?.plan_credits ?? 0), extra: Number(data?.extra_credits ?? 0) };
  },

  async deduct({ userId, amount, referenceId, description, metadata }): Promise<DeductResult> {
    const { data, error } = await createSupabaseAdminClient().rpc("deduct_credits_atomic", {
      p_user_id: userId,
      p_amount: amount,
      p_action: description,
      p_description: description,
      p_reference_id: referenceId,
      p_metadata: metadata,
    });
    if (error) return { status: "error", message: error.message };
    const r = (data ?? {}) as RpcResult;
    if (r.success && r.duplicate) return { status: "duplicate" };
    if (r.success) {
      return { status: "ok", planPart: Number(r.plan_part ?? 0), extraPart: Number(r.extra_part ?? 0), balanceAfter: Number(r.total_credits ?? 0) };
    }
    if (r.error === "Insufficient credits") return { status: "insufficient", balance: Number(r.balance ?? 0) };
    return { status: "error", message: r.error ?? "unknown" };
  },

  async credit({ userId, amount, toPlan, referenceId, type, description, metadata }): Promise<CreditResult> {
    const { data, error } = await createSupabaseAdminClient().rpc("add_credits_atomic", {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description,
      p_reference_id: referenceId,
      p_to_plan: toPlan,
      p_metadata: metadata,
    });
    if (error) return { status: "error", message: error.message };
    const r = (data ?? {}) as RpcResult;
    if (r.success && r.duplicate) return { status: "duplicate" };
    if (r.success) return { status: "ok", balanceAfter: Number(r.total_credits ?? 0) };
    return { status: "error", message: r.error ?? "unknown" };
  },

  async find(referenceId: string, type: LedgerType): Promise<LedgerRow | null> {
    const { data, error } = await createSupabaseAdminClient()
      .from("credit_transactions")
      .select("user_id, type, amount, metadata")
      .eq("reference_id", referenceId)
      .eq("type", type)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data
      ? { userId: data.user_id as string, type: data.type as string, amount: Number(data.amount), metadata: (data.metadata ?? {}) as Record<string, unknown> }
      : null;
  },

  async logUsage(userId, action, status) {
    await createSupabaseAdminClient().from("usage_logs").insert({ user_id: userId, action, credits_used: 0, status });
  },
};
