import { isSupabaseMode } from "@/lib/env";
import { readLocalDatabase, updateLocalDatabase, type UsageLogRecord } from "@/lib/local-store";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { createLogger } from "@/lib/logger";

const log = createLogger("credit-store");

export type UserCredits = {
  planCredits: number;
  extraCredits: number;
  totalCredits: number;
  monthlyUsage: number;
  hasSubscription: boolean;
};

export async function getUserCredits(userId: string): Promise<UserCredits> {
  log.info("Fetching user credits for user:", userId);

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

    const planCredits = profile?.plan_credits ?? 500;
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
      (sum, log) => sum + (log.credits_used || 0),
      0
    );

    const hasSubscription = false;

    return { planCredits, extraCredits, totalCredits, monthlyUsage, hasSubscription };
  }

  log.debug("Using local database to get user credits.");
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
      (log) =>
        log.userId === userId &&
        log.status === "Success" &&
        new Date(log.createdAt) >= startOfMonth
    )
    .reduce((sum, log) => sum + log.creditsUsed, 0);

  const hasSubscription = database.subscriptions.some(
    (s) => s.userId === userId && s.status === "active"
  );

  const planCredits = user.planCredits ?? 500; // default 500
  const extraCredits = user.extraCredits ?? 0;
  const totalCredits = planCredits + extraCredits;

  return {
    planCredits,
    extraCredits,
    totalCredits,
    monthlyUsage,
    hasSubscription,
  };
}

export async function deductCredits(userId: string, amount: number, actionDesc: string): Promise<boolean> {
  log.info("Deducting unified credits for user:", userId, "amount:", amount);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    
    // Check balance first
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_credits, extra_credits")
      .eq("id", userId)
      .single();

    if (!profile) return false;

    const currentPlan = profile.plan_credits ?? 0;
    const currentExtra = profile.extra_credits ?? 0;

    if (currentPlan + currentExtra < amount) {
      await supabase.from("usage_logs").insert({
        user_id: userId,
        action: actionDesc,
        credits_used: amount,
        status: "Failed",
      });
      return false;
    }

    let newPlan = currentPlan;
    let newExtra = currentExtra;

    if (newPlan >= amount) {
      newPlan -= amount;
    } else {
      const remainder = amount - newPlan;
      newPlan = 0;
      newExtra -= remainder;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ plan_credits: newPlan, extra_credits: newExtra })
      .eq("id", userId);

    if (updateError) return false;

    await supabase.from("usage_logs").insert({
      user_id: userId,
      action: actionDesc,
      credits_used: amount,
      status: "Success",
    });

    return true;
  }

  return updateLocalDatabase((database) => {
    const user = database.users.find((u) => u.id === userId);
    if (!user) return false;

    const currentPlan = user.planCredits ?? 500;
    const currentExtra = user.extraCredits ?? 0;

    if (currentPlan + currentExtra < amount) {
      database.usageLogs.unshift({
        id: crypto.randomUUID(),
        userId,
        action: actionDesc,
        creditsUsed: amount,
        status: "Failed",
        createdAt: new Date().toISOString(),
      });
      return false;
    }

    let newPlan = currentPlan;
    let newExtra = currentExtra;

    if (newPlan >= amount) {
      newPlan -= amount;
    } else {
      const remainder = amount - newPlan;
      newPlan = 0;
      newExtra -= remainder;
    }

    user.planCredits = newPlan;
    user.extraCredits = newExtra;

    database.usageLogs.unshift({
      id: crypto.randomUUID(),
      userId,
      action: actionDesc,
      creditsUsed: amount,
      status: "Success",
      createdAt: new Date().toISOString(),
    });

    return true;
  });
}

export async function buyCredits(userId: string, amount: number, packageDesc: string): Promise<boolean> {
  log.info("Buying extra credits for user:", userId, "amount:", amount);

  if (isSupabaseMode()) {
    const supabase = createSupabaseAdminClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("extra_credits")
      .eq("id", userId)
      .single();

    if (error || !profile) return false;

    await supabase
      .from("profiles")
      .update({
        extra_credits: (profile.extra_credits ?? 0) + amount,
      })
      .eq("id", userId);

    await supabase.from("usage_logs").insert({
      user_id: userId,
      action: `Purchased ${packageDesc}`,
      credits_used: 0,
      status: "Success",
    });

    return true;
  }

  return updateLocalDatabase((database) => {
    const user = database.users.find((u) => u.id === userId);
    if (!user) return false;

    user.extraCredits = (user.extraCredits ?? 0) + amount;

    database.usageLogs.unshift({
      id: crypto.randomUUID(),
      userId,
      action: `Purchased ${packageDesc}`,
      creditsUsed: 0,
      status: "Success",
      createdAt: new Date().toISOString(),
    });

    return true;
  });
}

export async function listUsageLogsForUser(userId: string): Promise<UsageLogRecord[]> {
  log.info("Listing usage logs for user:", userId);

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

    return (response.data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      creditsUsed: row.credits_used,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  const database = await readLocalDatabase();
  return database.usageLogs
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 50);
}
