import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  automationConfigSchema,
  automationWorkflowSchema,
  connectionStatusSchema,
} from "@/lib/automation";
import { createAutomation } from "@/lib/automation-store";
import { jsonError } from "@/lib/api";

/* LOGIC EXPLAINED:
The frontend sends the generated workflow and the form inputs here to save a
real automation. The fix adds clear logs around auth, validation, and save so
you can tell exactly where saving stops if something goes wrong.
*/

const saveSchema = z.object({
  workflow: automationWorkflowSchema,
  formInputs: automationConfigSchema,
  integrationStatus: z.record(z.string(), connectionStatusSchema),
});

export async function POST(request: Request) {
  console.log("[api/save-automation] Request received.");
  const user = await getCurrentUser();

  if (!user) {
    console.log("[api/save-automation] No authenticated user found.");
    return jsonError("Authentication required.", 401);
  }

  try {
    console.log("[api/save-automation] Authenticated user:", user.id);
    const body = saveSchema.parse(await request.json());
    console.log("[api/save-automation] Payload validated.");
    const automation = await createAutomation({
      userId: user.id,
      workflow: body.workflow,
      formInputs: body.formInputs,
      integrationStatus: body.integrationStatus,
      status: "active",
    });
    console.log("[api/save-automation] Automation saved:", automation.id);

    return Response.json({ automation });
  } catch (error) {
    console.error("[api/save-automation] Request failed.", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid automation payload."
        : error instanceof Error
          ? error.message
          : "Could not save automation.";

    return jsonError(message, 400);
  }
}
