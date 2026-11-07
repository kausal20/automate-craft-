import { cookies } from "next/headers";
import type { AuthenticatedUser } from "@/lib/automation";
import { DEMO_USER } from "@/mock/data/user";
import { SESSION_COOKIE } from "@/mock/session";

/**
 * PROTOTYPE MOCK of src/lib/auth.ts. Same export names, no real auth.
 *
 * "Signed in" is one cookie, set by the mock login handler or the prototype
 * panel. Dashboard routes stay open when signed out so every page can be
 * designed without logging in first.
 */
export async function getCurrentUser(_options?: {
  allowUnverified?: boolean;
}): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE) ? DEMO_USER : null;
}

export async function requireUser(): Promise<AuthenticatedUser> {
  return DEMO_USER;
}
