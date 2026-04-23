import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isOpenAccessMode, isSupabaseAuthEnabled } from "@/lib/env";

/**
 * Edge proxy (middleware) — runs before every request.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie on every request so it never silently expires.
 * 2. Redirect authenticated users away from public-auth pages (/, /login, /signup) → /dashboard.
 * 3. Redirect unauthenticated users away from protected routes (/dashboard, /setup, /onboarding) → /login.
 * 4. Redirect unverified users to /verify-email before they access protected routes.
 *
 * Uses supabase.auth.getUser() (validates JWT server-side) — never getSession().
 */

/** Pages that should redirect to /dashboard when a user is already logged in */
const AUTH_PAGES = new Set(["/", "/login", "/signup"]);

/** Route prefixes that require a verified, authenticated session */
const PROTECTED_PREFIXES = ["/dashboard", "/setup", "/onboarding"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // In open-access mode, let everything through — server components handle auth
  if (isOpenAccessMode()) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  // If Supabase is not configured, fall back to server-component auth
  if (!isSupabaseAuthEnabled()) {
    return response;
  }

  const supabase = createServerClient(
    env.supabaseUrl!,
    env.supabasePublishableKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagate refreshed cookies to both the request and the response
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser() contacts Supabase to validate the JWT — the only safe way to check auth at the edge
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isVerified = Boolean(user?.email_confirmed_at);
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // ── Unauthenticated user hitting a protected route → /login ──
  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // ── Authenticated but unverified user hitting a protected route → /verify-email ──
  if (user && !isVerified && isProtected) {
    const verifyUrl = new URL("/verify-email", request.url);
    if (user.email) verifyUrl.searchParams.set("email", user.email);
    return NextResponse.redirect(verifyUrl);
  }

  // ── Authenticated user hitting an auth/public page → /dashboard ──
  if (user && AUTH_PAGES.has(pathname)) {
    if (!isVerified) {
      const verifyUrl = new URL("/verify-email", request.url);
      if (user.email) verifyUrl.searchParams.set("email", user.email);
      return NextResponse.redirect(verifyUrl);
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Pass through all other requests with refreshed session cookies
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
