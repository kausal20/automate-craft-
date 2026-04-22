import { z } from "zod";
import { jsonError } from "@/lib/api";
import { isSupabaseAuthEnabled } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase";

const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export async function POST(request: Request) {
  try {
    if (!isSupabaseAuthEnabled()) {
      return jsonError("Password reset requires Supabase to be configured.", 400);
    }

    const body = resetPasswordSchema.parse(await request.json());
    const normalizedEmail = body.email.trim().toLowerCase();

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000");

    const supabase = await createSupabaseRouteClient();
    
    // Supabase reset password functionality
    // This will send an email with a secure link to the user
    // When they click it, they will be redirected back with a valid session
    // to update their password.
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
    });

    if (error) {
      console.error("[api/auth/reset-password] Supabase error:", error.message);
      return jsonError(error.message, 400);
    }

    return Response.json({ success: true });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid request."
        : error instanceof Error
          ? error.message
          : "Could not send reset link.";

    return jsonError(message, 400);
  }
}
