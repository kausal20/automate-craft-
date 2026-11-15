import { isSupabaseMode } from "@/lib/env";
import { readLocalDatabase, updateLocalDatabase, type UsageLogRecord } from "@/lib/local-store";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { createLogger } from "@/lib/logger";
import { ensureLocalCreditUser, getCreditService } from "@/lib/credits";
import { planGrant } from "@/lib/plans";

const log = createLogger("credit-store");

export type UserCredits = {
  planCredits: number;
  extraCredits: number;
  totalCredits: number;
  monthlyUsage: number;
  hasSubscription: boolean;
  /** Active plan id, if any. */
  planId: string | null;
  /** Monthly allowance of the active plan (0 without a plan). */
  monthlyGrant: number;
};

export type CreditTransaction = {
  id: string;
  userId: string;
  type: "grant" | "deduct" | "purchase" | "subscription" | "refund" | "adjustment";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

// ─── Get User Credits ─────────────────────────────────────────────

export async function getUserCredits(userId: string): Promise<UserCredits> {
  log.info("Fetching user credits for user:", userId);

  if (userId === "guest-user") {
    return {
      planCredits: 10,
      extraCredits: 0,
      totalCredits: 10,
      monthlyUsage: 0,
      hasSubscription: false,
      planId: null,
      monthlyGrant: 0,
    };
  }

  if (isSupabaseMode()) {
    log.debug("Using Supabase to get user credits.");
    const supabase = createSupabaseAdminClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("plan_credits, extra_credits")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      log.error("Failed to fetch credits from Supabase", error);
      throw new Error(error.message);
    }

    const planCredits = profile?.plan_credits ?? 10;
    const extraCredits = profile?.extra_credits ?? 0;
    const totalCredits = planCredits + extraCredits;

    // Get monthly usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usageLogs } = await supabase
      .from("usage_logs")
      .select("credits_used")
      .eq("user_id", userId)
      .eq("status", "Success")
      .gte("created_at", startOfMonth.toISOString());

    const monthlyUsage = (usageLogs ?? []).reduce(
      (sum, entry) => sum + (entry.credits_used || 0),
      0
    );

    // Check active subscription
    const { data: activeSub } = await supabase
      .from("subscriptions")
      .select("id, plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const hasSubscription = !!activeSub;
    const planId = (activeSub?.plan_id as string | undefined) ?? null;
    const monthlyGrant = planId ? planGrant(planId)?.monthlyCredits ?? 0 : 0;

    return { planCredits, extraCredits, totalCredits, monthlyUsage, hasSubscription, planId, monthlyGrant };
  }

  log.debug("Using local database to get user credits.");
  await ensureLocalCreditUser(userId);
  const database = await readLocalDatabase();
  const user = database.users.find((u) => u.id === userId);

  if (!user) {
    throw new Error("User not found");
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyUsage = database.usageLogs
    .filter(
      (entry) =>
        entry.userId === userId &&
        entry.status === "Success" &&
        new Date(entry.createdAt) >= startOfMonth
    )
    .reduce((sum, entry) => sum + entry.creditsUsed, 0);

  const activeSub = database.subscriptions.find((s) => s.userId === userId && s.status === "active");
  const hasSubscription = !!activeSub;
  const planId = activeSub?.planId ?? null;
  const monthlyGrant = planId ? planGrant(planId)?.monthlyCredits ?? 0 : 0;

  const planCredits = user.planCredits ?? 10;
  const extraCredits = user.extraCredits ?? 0;
  const totalCredits = planCredits + extraCredits;

  return {
    planCredits,
    extraCredits,
    totalCredits,
    monthlyUsage,
    hasSubscription,
    planId,
    monthlyGrant,
  };
}

// Deductions, refunds and purchases live in the credit service (@/lib/credits).
// Nothing here moves credits directly any more.

// ─── Grant Subscription Credits ───────────────────────────────────

/** Calendar month (UTC) the grant belongs to, e.g. "2026-11". */
export function grantMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function subscriptionGrantReference(userId: string, planId: string, now: Date = new Date()): string {
  return `subscription:${userId}:${planId}:${grantMonth(now)}`;
}

/**
 * Subscribe + grant the plan's credits. Idempotent per user + plan + calendar
 * month: a second call in the same month changes nothing and returns true.
 * Credit amounts come from src/lib/plans.ts. Renewal / rollover is later work.
 */
export async function grantSubscriptionCredits(userId: string, planId: string, now: Date = new Date()): Promise<boolean> {
  const plan = planGrant(planId);
  if (!plan) return false;
  const credits = getCreditService();
  const referenceId = subscriptionGrantReference(userId, planId, now);

  if (await credits.isGranted(referenceId, "subscription")) {
    log.info("Subscription grant already applied this month; skipping.", { planId });
    return true;
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    await supabase.from("subscriptions").update({ status: "canceled" }).eq("user_id", userId).eq("status", "active");
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: planId,
      plan_name: plan.name,
      credits_granted: plan.credits,
      status: "active",
      expires_at: expiresAt.toISOString(),
    });
    if (subError) {
      log.error("Failed to create subscription", subError);
      return false;
    }
  } else {
    await ensureLocalCreditUser(userId);
    await updateLocalDatabase((database) => {
      database.subscriptions
        .filter((s) => s.userId === userId && s.status === "active")
        .forEach((s) => { s.status = "canceled"; });
      database.subscriptions.push({
        id: crypto.randomUUID(),
        userId,
        planId,
        startDate: now.toISOString(),
        status: "active",
      });
    });
  }

  const granted = await credits.grant({
    userId,
    amount: plan.credits,
    kind: "subscription",
    referenceId,
    description: `Subscribed to ${plan.name} — +${plan.credits} credits`,
    metadata: { plan_id: planId, plan_name: plan.name, month: grantMonth(now) },
  });
  return granted.ok;
}

// ─── List Usage Logs ──────────────────────────────────────────────

export async function listUsageLogsForUser(userId: string): Promise<UsageLogRecord[]> {
  log.info("Listing usage logs for user:", userId);

  if (userId === "guest-user") {
    return [];
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const response = await supabase
      .from("usage_logs")
      .select("id, user_id, action, credits_used, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      action: row.action as string,
      creditsUsed: row.credits_used as number,
      status: row.status as "Success" | "Failed",
      createdAt: row.created_at as string,
    }));
  }

  const database = await readLocalDatabase();
  return database.usageLogs
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 50);
}

// ─── List Credit Transactions ─────────────────────────────────────

export async function listCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  log.info("Listing credit transactions for user:", userId);

  if (userId === "guest-user") {
    return [];
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("id, user_id, type, amount, balance_after, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      log.error("Failed to fetch credit transactions", error);
      throw new Error(error.message);
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as CreditTransaction["type"],
      amount: row.amount as number,
      balanceAfter: row.balance_after as number,
      description: row.description as string,
      createdAt: row.created_at as string,
    }));
  }

  // Local mode — the local ledger mirrors credit_transactions, balanceAfter included.
  const database = await readLocalDatabase();
  return database.creditTransactions
    .filter((t) => t.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 100)
    .map((t) => ({
      id: t.id,
      userId: t.userId,
      type: t.type as CreditTransaction["type"],
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt,
    }));
}
