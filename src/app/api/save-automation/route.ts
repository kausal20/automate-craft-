import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  automationConfigSchema,
  automationWorkflowSchema,
  connectionStatusSchema,
} from "@/lib/automation";
import { createAutomation } from "@/lib/automation-store";
import { handleRouteError } from "@/lib/api";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/save-automation");

const saveSchema = z.object({
  workflow: automationWorkflowSchema,
  formInputs: automationConfigSchema,
  integrationStatus: z.record(z.string(), connectionStatusSchema),
});

export async function POST(request: Request) {
  log.info("Request received.");
  const user = await getCurrentUser();

  if (!user) {
    log.warn("No authenticated user found.");
    return handleRouteError(new Error("Authentication required."), "Authentication required.", 401);
  }

  try {
    log.debug("Authenticated user:", user.id);
    const body = saveSchema.parse(await request.json());
    log.debug("Payload validated.");
    const automation = await createAutomation({
      userId: user.id,
      workflow: body.workflow,
      formInputs: body.formInputs,
      integrationStatus: body.integrationStatus,
      status: "active",
    });
    log.info("Automation saved:", automation.id);

    return Response.json({ automation });
  } catch (error) {
    log.error("Request failed.", error);
    return handleRouteError(error, "Could not save automation.");
  }
}
