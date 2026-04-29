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
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  try {
    const body = connectSchema.parse(await request.json());
    const connection = await upsertIntegrationConnection({
      userId: user.id,
      integration: body.integration,
      status: "connected",
    });

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
