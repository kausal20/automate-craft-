import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Setup Profile | AutomateCraft",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // If already onboarded, send them to dashboard immediately
  if (user.onboarded) {
    redirect("/dashboard");
  }

  return <OnboardingFlow user={user} />;
}
