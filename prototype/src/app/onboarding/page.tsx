import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Setup Profile | AutomateCraft",
};

export default async function OnboardingPage() {
  const user = await requireUser();

  return <OnboardingFlow user={user} />;
}
