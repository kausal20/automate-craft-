import { z } from "zod";
import { integrationSchema } from "@/lib/automation";
import { getCurrentUser } from "@/lib/auth";
import { upsertIntegrationConnection } from "@/lib/automation-store";
import { jsonError } from "@/lib/api";

/* LOGIC EXPLAINED:
The homepage and dashboard send an integration name here when the user clicks
Connect. The logs added below show whether the user was authenticated, whether
the integration name was valid, and whether the connection state was saved.
*/

const connectSchema = z.object({
  integration: integrationSchema,
});

export async function POST(request: Request) {
  console.log("[api/integrations/connect] Request received.");
  const user = await getCurrentUser();

  if (!user) {
    console.log("[api/integrations/connect] No authenticated user found.");
    return jsonError("Authentication required.", 401);
  }

  try {
    console.log("[api/integrations/connect] Authenticated user:", user.id);
    const body = connectSchema.parse(await request.json());
    console.log("[api/integrations/connect] Integration validated:", body.integration);
    const connection = await upsertIntegrationConnection({
      userId: user.id,
      integration: body.integration,
      status: "connected",
    });
    console.log("[api/integrations/connect] Connection saved.");

    return Response.json({ connection });
  } catch (error) {
    console.error("[api/integrations/connect] Request failed.", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid integration request."
        : error instanceof Error
          ? error.message
          : "Could not connect integration.";

    return jsonError(message, 400);
  }
}
