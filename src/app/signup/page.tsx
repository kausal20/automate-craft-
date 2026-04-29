import AuthScreen from "@/components/auth/AuthScreen";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseAuthEnabled } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/navigation";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Sign up for AutomateCraft — 10 free credits, no credit card required. Build AI automations in minutes.",
};

type SearchParams = Promise<{
  next?: string | string[];
  error?: string | string[];
  focus?: string | string[];
}>;

function pickFirst(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser({ allowUnverified: true });
  if (user) {
    redirect(
      user.emailVerified
        ? "/dashboard"
        : `/verify-email?email=${encodeURIComponent(user.email)}`,
    );
  }

  const params = await searchParams;

  return (
    <AuthScreen
      mode="signup"
      nextPath={sanitizeNextPath(pickFirst(params.next))}
      initialError={pickFirst(params.error) || null}
      socialAuthEnabled={isSupabaseAuthEnabled()}
      ssoEnabled={isSsoEnabled()}
      focusSso={pickFirst(params.focus) === "sso"}
    />
  );
}
