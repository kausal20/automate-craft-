import { NextRequest, NextResponse } from "next/server";
import { isSupabaseMode } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/navigation";
import { syncSupabaseProfileFromCurrentSession } from "@/lib/auth";
import { createSupabaseRouteClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
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

  if (!isSupabaseMode() || !code) {
    return NextResponse.redirect(
      new URL("/login?error=Could%20not%20complete%20sign%20in.", request.url),
    );
  }

  const supabase = await createSupabaseRouteClient();
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
