import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { runAutomationForUser } from "@/lib/execution-engine";
import { jsonError } from "@/lib/api";

/* LOGIC EXPLAINED:
This route starts a manual automation run from the dashboard. The route now
logs the request lifecycle so you can see if the click reached the server, if
the automation id was valid, and whether execution started.
*/

const runSchema = z.object({
  automationId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  console.log("[api/run-automation] Request received.");
  const user = await getCurrentUser();

  if (!user) {
    console.log("[api/run-automation] No authenticated user found.");
    return jsonError("Authentication required.", 401);
  }

  try {
    console.log("[api/run-automation] Authenticated user:", user.id);
    const body = runSchema.parse(await request.json());
    console.log("[api/run-automation] Payload validated for automation:", body.automationId);
    const run = await runAutomationForUser({
      userId: user.id,
      automationId: body.automationId,
      payload: body.payload,
      triggerSource: "manual",
    });
    console.log("[api/run-automation] Automation run created:", run.id);

    return Response.json({ run });
  } catch (error) {
    console.error("[api/run-automation] Request failed.", error);
    return jsonError(
      error instanceof Error ? error.message : "Could not run automation.",
      400,
    );
  }
}
