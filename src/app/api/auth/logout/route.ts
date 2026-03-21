import { signOutCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

/* LOGIC EXPLAINED:
The dashboard sign-out button sends a request here. The logs make it obvious
whether the sign-out request ran and whether the session was cleared.
*/

export async function POST() {
  try {
    console.log("[api/auth/logout] Request received.");
    await signOutCurrentUser();
    console.log("[api/auth/logout] Sign out completed.");
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/logout] Request failed.", error);
    return jsonError(
      error instanceof Error ? error.message : "Could not sign out.",
      400,
    );
  }
}
