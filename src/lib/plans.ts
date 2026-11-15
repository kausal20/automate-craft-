/**
 * Single source of truth for how many credits each plan grants.
 *
 * Monthly ids grant `monthlyCredits` per grant; yearly ids grant 12x the
 * monthly amount, computed here (period scheduling is later work). Prices and
 * website copy are NOT defined here and are not changed by this file.
 */

export type PlanKey = "starter" | "plus" | "pro";

export const PLANS: Record<PlanKey, { name: string; monthlyCredits: number }> = {
  starter: { name: "Starter", monthlyCredits: 15000 },
  plus: { name: "Plus", monthlyCredits: 30000 },
  pro: { name: "Pro", monthlyCredits: 60000 },
};

export interface PlanGrant {
  planId: string;
  key: PlanKey;
  name: string;
  yearly: boolean;
  /** Credits granted when this plan id is subscribed to. */
  credits: number;
  /** The plan's monthly allowance (used for usage % and low-credit state). */
  monthlyCredits: number;
}

const PLAN_ID = /^plan_(starter|plus|pro)(_yearly)?$/;

/** Resolve a plan id (plan_starter, plan_plus_yearly, ...) to its grant. Unknown ids -> null. */
export function planGrant(planId: string): PlanGrant | null {
  const m = PLAN_ID.exec(planId);
  if (!m) return null;
  const key = m[1] as PlanKey;
  const yearly = Boolean(m[2]);
  const { name, monthlyCredits } = PLANS[key];
  return {
    planId,
    key,
    name: yearly ? `${name} (Yearly)` : name,
    yearly,
    credits: yearly ? monthlyCredits * 12 : monthlyCredits,
    monthlyCredits,
  };
}

/** Every subscribable plan id, monthly and yearly. */
export const PLAN_IDS: string[] = (Object.keys(PLANS) as PlanKey[]).flatMap((k) => [`plan_${k}`, `plan_${k}_yearly`]);
