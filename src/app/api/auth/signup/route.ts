import { z } from "zod";
import { signUpWithCredentials } from "@/lib/auth";
import { jsonError } from "@/lib/api";

/* LOGIC EXPLAINED:
The signup form sends account details here. These logs show whether the route
received the data, whether it was valid, and whether account creation worked.
*/

const signupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(120),
});

export async function POST(request: Request) {
  try {
    console.log("[api/auth/signup] Request received.");
    const body = signupSchema.parse(await request.json());
    console.log("[api/auth/signup] Payload validated for:", body.email);
    const result = await signUpWithCredentials(body);
    console.log("[api/auth/signup] Sign up succeeded for:", result.user.email);

    return Response.json({ user: result.user });
  } catch (error) {
    console.error("[api/auth/signup] Request failed.", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid request."
        : error instanceof Error
          ? error.message
          : "Could not create account.";

    return jsonError(message, 400);
  }
}
