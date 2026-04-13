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

  // Temporarily commented out for testing so you can view the page
  // if (user.onboarded) {
  //   redirect("/");
  // }

  return <OnboardingFlow user={user} />;
}
