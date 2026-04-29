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
    const body = signupSchema.parse(await request.json());
    const result = await signUpWithCredentials(body);

    return Response.json({
      user: result.user,
      needsEmailVerification: result.needsEmailVerification ?? false,
    });
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
