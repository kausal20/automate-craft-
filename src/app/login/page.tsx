import AuthScreen from "@/components/auth/AuthScreen";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseAuthEnabled } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/navigation";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
  next?: string | string[];
  error?: string | string[];
  focus?: string | string[];
}>;

function pickFirst(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <AuthScreen
      mode="login"
      nextPath={sanitizeNextPath(pickFirst(params.next))}
      initialError={pickFirst(params.error) || null}
      socialAuthEnabled={isSupabaseAuthEnabled()}
      ssoEnabled={isSsoEnabled()}
      focusSso={pickFirst(params.focus) === "sso"}
    />
  );
}
