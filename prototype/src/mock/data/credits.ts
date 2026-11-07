import { daysAgo, hoursAgo } from "./time";

export type MockCredits = {
  planCredits: number;
  extraCredits: number;
  monthlyUsage: number;
  hasSubscription: boolean;
};

export type MockCreditEvent = {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
};

export const seedCredits = (): MockCredits => ({
  planCredits: 1120,
  extraCredits: 600,
  monthlyUsage: 380,
  hasSubscription: true,
});

export const seedCreditEvents = (): MockCreditEvent[] => [
  { id: "tx-1", amount: -4, description: "Executed Automation", createdAt: hoursAgo(2) },
  { id: "tx-2", amount: -12, description: "Generated workflow", createdAt: hoursAgo(9) },
  { id: "tx-3", amount: 600, description: "600 Credits Top-up", createdAt: daysAgo(4) },
  { id: "tx-4", amount: 1500, description: "Plus plan renewal", createdAt: daysAgo(11) },
];

/** Prices are not mocked here: the UI holds them. These only map id to credits. */
export const CREDIT_PACKAGES: Record<string, number> = {
  pkg_600: 600,
  pkg_3600: 3600,
  pkg_7200: 7200,
  pkg_14400: 14400,
  pkg_30000: 30000,
};

export const PLANS: Record<string, { name: string; credits: number }> = {
  plan_starter: { name: "Starter", credits: 500 },
  plan_starter_yearly: { name: "Starter (Yearly)", credits: 6000 },
  plan_plus: { name: "Plus", credits: 1500 },
  plan_plus_yearly: { name: "Plus (Yearly)", credits: 18000 },
  plan_pro: { name: "Pro", credits: 3000 },
  plan_pro_yearly: { name: "Pro (Yearly)", credits: 36000 },
};
