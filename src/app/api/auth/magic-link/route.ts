import { z } from "zod";
import { jsonError } from "@/lib/api";
import { isSupabaseAuthEnabled } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase";

const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export async function POST(request: Request) {
  try {
    if (!isSupabaseAuthEnabled()) {
      return jsonError("Magic link login requires Supabase to be configured.", 400);
    }

    const body = magicLinkSchema.parse(await request.json());
    const normalizedEmail = body.email.trim().toLowerCase();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000");

    const supabase = await createSupabaseRouteClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      console.error("[api/auth/magic-link] Supabase OTP error:", error.message);
      return jsonError(error.message, 400);
    }

    return Response.json({ success: true });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid request."
        : error instanceof Error
          ? error.message
          : "Could not send magic link.";

    return jsonError(message, 400);
  }
}
