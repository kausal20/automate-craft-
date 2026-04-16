import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAuthEnabled } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/navigation";
import { syncSupabaseProfileFromCurrentSession } from "@/lib/auth";
import { createSupabaseRouteClient } from "@/lib/supabase";

/**
 * Auth callback handler for both OAuth and email verification flows.
 *
 * OAuth flow:   Google → Supabase → /auth/callback?code=...&next=...
 * Email verify: Supabase email link → /auth/callback?token_hash=...&type=email&next=...
 * PKCE flow:    Supabase → /auth/callback?code=...&next=...
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const providerError =
    request.nextUrl.searchParams.get("error_description") ||
    request.nextUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(providerError)}`,
        request.url,
      ),
    );
  }

  if (!isSupabaseAuthEnabled()) {
    return NextResponse.redirect(
      new URL("/login?error=Could%20not%20complete%20sign%20in.", request.url),
    );
  }

  const supabase = await createSupabaseRouteClient();

  // Handle email verification (token_hash + type flow)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "signup" | "recovery" | "invite",
    });

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            error.message || "Email verification failed. Please try again.",
          )}`,
          request.url,
        ),
      );
    }

    await syncSupabaseProfileFromCurrentSession();
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  // Handle OAuth / PKCE code exchange
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Could%20not%20complete%20sign%20in.", request.url),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          error.message || "Could not complete sign in.",
        )}`,
        request.url,
      ),
    );
  }

  await syncSupabaseProfileFromCurrentSession();

  return NextResponse.redirect(new URL(nextPath, request.url));
}
