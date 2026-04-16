import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { isOpenAccessMode } from "@/lib/env";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Setup Profile | AutomateCraft",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user && !isOpenAccessMode()) {
    redirect("/login");
  }

  return <OnboardingFlow user={user!} />;
}
