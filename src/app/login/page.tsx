import AuthScreen from "@/components/auth/AuthScreen";
import { isSupabaseMode } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/navigation";

type SearchParams = Promise<{
  next?: string | string[];
  error?: string | string[];
}>;

function pickFirst(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <AuthScreen
      mode="login"
      nextPath={sanitizeNextPath(pickFirst(params.next))}
      initialError={pickFirst(params.error) || null}
      socialAuthEnabled={isSupabaseMode()}
    />
  );
}
