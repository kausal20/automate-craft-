import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseMode } from "@/lib/env";
import { sanitizeNextPath } from "@/lib/navigation";
import { createSupabaseRouteClient } from "@/lib/supabase";

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter a valid domain.")
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i,
    "Enter a valid domain (e.g. company.com).",
  );

const providerIdSchema = z.string().uuid("Invalid SSO provider id.");

export async function GET(request: NextRequest) {
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const domainRaw = request.nextUrl.searchParams.get("domain");
  const providerIdRaw = request.nextUrl.searchParams.get("providerId");

  if (!isSupabaseMode()) {
    return NextResponse.redirect(
      new URL(
        "/login?error=Enterprise%20SSO%20requires%20Supabase%20configuration.",
        request.url,
      ),
    );
  }

  const supabase = await createSupabaseRouteClient();
  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("next", nextPath);

  if (providerIdRaw) {
    const providerIdResult = providerIdSchema.safeParse(providerIdRaw);
    if (!providerIdResult.success) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(providerIdResult.error.issues[0]?.message || "Invalid SSO provider.")}`,
          request.url,
        ),
      );
    }

    const { data, error } = await supabase.auth.signInWithSSO({
      providerId: providerIdResult.data,
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error || !data?.url) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            error?.message || "Could not start SSO sign-in.",
          )}`,
          request.url,
        ),
      );
    }

    return NextResponse.redirect(data.url);
  }

  if (!domainRaw) {
    return NextResponse.redirect(
      new URL("/login?error=Enter%20your%20organization%20domain.", request.url),
    );
  }

  const domainResult = domainSchema.safeParse(domainRaw);
  if (!domainResult.success) {
    const message =
      domainResult.error.issues[0]?.message || "Enter a valid domain.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url),
    );
  }

  const { data, error } = await supabase.auth.signInWithSSO({
    domain: domainResult.data,
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          error?.message || "Could not start SSO sign-in.",
        )}`,
        request.url,
      ),
    );
  }

  return NextResponse.redirect(data.url);
}
