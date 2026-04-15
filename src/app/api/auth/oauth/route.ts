import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseAuthEnabled } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/navigation";
import { createSupabaseRouteClient } from "@/lib/supabase";

const providerSchema = z.literal("google");

export async function GET(request: NextRequest) {
  const providerResult = providerSchema.safeParse(
    request.nextUrl.searchParams.get("provider"),
  );
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

  if (!providerResult.success) {
    return NextResponse.redirect(
      new URL("/login?error=Google%20sign-in%20is%20the%20only%20supported%20social%20provider.", request.url),
    );
  }

  if (!isSupabaseAuthEnabled()) {
    return NextResponse.redirect(
      new URL(
        "/login?error=Social%20login%20requires%20Supabase%20configuration.",
        request.url,
      ),
    );
  }

  const supabase = await createSupabaseRouteClient();
  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("next", nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          error?.message || "Could not start social login.",
        )}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(data.url);
}
