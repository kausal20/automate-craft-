import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isOpenAccessMode, isSupabaseAuthEnabled } from "@/lib/env";

const AUTH_PAGES = new Set(["/login", "/signup"]);
const PROTECTED_PREFIXES = ["/dashboard", "/setup", "/onboarding"];
const DEBUG_ENDPOINT = "http://127.0.0.1:7855/ingest/35f1ca99-d0a5-471f-8d2e-699878613661";
const DEBUG_SESSION_ID = "76d521";

function postDebugLog(payload: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      ...payload,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export async function proxy(request: NextRequest) {
  postDebugLog({
    runId: "baseline",
    hypothesisId: "H2",
    location: "src/proxy.ts:34",
    message: "Proxy request received",
    data: { pathname: request.nextUrl.pathname, method: request.method },
  });

  if (isOpenAccessMode()) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isVerified = Boolean(user?.email_confirmed_at);
  postDebugLog({
    runId: "baseline",
    hypothesisId: "H2",
    location: "src/proxy.ts:78",
    message: "Proxy auth state resolved",
    data: { pathname, hasUser: Boolean(user), isVerified },
  });

  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    postDebugLog({
      runId: "baseline",
      hypothesisId: "H5",
      location: "src/proxy.ts:87",
      message: "Redirecting unauthenticated user to login",
      data: { pathname },
    });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isVerified && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const verifyUrl = new URL("/verify-email", request.url);
    if (user.email) {
      verifyUrl.searchParams.set("email", user.email);
    }
    return NextResponse.redirect(verifyUrl);
  }

  if (user && AUTH_PAGES.has(pathname)) {
    if (!isVerified) {
      const verifyUrl = new URL("/verify-email", request.url);
      if (user.email) {
        verifyUrl.searchParams.set("email", user.email);
      }
      return NextResponse.redirect(verifyUrl);
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
