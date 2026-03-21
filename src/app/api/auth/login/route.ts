import { z } from "zod";
import { signInWithCredentials } from "@/lib/auth";
import { jsonError } from "@/lib/api";

/* LOGIC EXPLAINED:
The login form sends email and password here. These logs show whether the
request arrived, whether validation passed, and whether sign-in succeeded.
*/

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(120),
});

export async function POST(request: Request) {
  try {
    console.log("[api/auth/login] Request received.");
    const body = loginSchema.parse(await request.json());
    console.log("[api/auth/login] Payload validated for:", body.email);
    const result = await signInWithCredentials(body);
    console.log("[api/auth/login] Sign in succeeded for:", result.user.email);

    return Response.json({ user: result.user });
  } catch (error) {
    console.error("[api/auth/login] Request failed.", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid login request."
        : error instanceof Error
          ? error.message
          : "Could not sign in.";

    return jsonError(message, 400);
  }
}
