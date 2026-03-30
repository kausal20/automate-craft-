import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { runAutomationForUser } from "@/lib/execution-engine";
import { getAutomationByIdForUser } from "@/lib/automation-store";
import { deductCredits } from "@/lib/credit-store";
import { handleRouteError } from "@/lib/api";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/run-automation");

const runSchema = z.object({
  automationId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
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
    const body = runSchema.parse(await request.json());
    log.debug("Running automation:", body.automationId);

    const automation = await getAutomationByIdForUser(user.id, body.automationId);
    if (!automation) {
      return handleRouteError(new Error("Automation not found."), "Automation not found.", 404);
    }

    const hasWhatsapp = automation.workflow.integrations.includes("whatsapp");
    const hasEmail = automation.workflow.integrations.includes("email");
    
    let creditsToDeduct = 1; // Base execution cost
    if (hasWhatsapp) creditsToDeduct += 2;
    if (hasEmail) creditsToDeduct += 1;
    // CRM would similarly be +1 here if/when formally integrated into the types 
    // We can assume +1 for any generic generic webhook out?
    // User specified: WhatsApp -> +2, Email -> +1, CRM -> +1.
    if (automation.workflow.steps.some(s => s.name.toLowerCase().includes("crm"))) {
      creditsToDeduct += 1;
    }

    const actionDesc = "Executed Automation";

    const success = await deductCredits(user.id, creditsToDeduct, actionDesc);
    if (!success) {
      return handleRouteError(new Error("Not enough credits."), "Not enough credits.", 402);
    }

    const run = await runAutomationForUser({
      userId: user.id,
      automationId: body.automationId,
      payload: body.payload,
      triggerSource: "manual",
    });
    log.info("Automation run created:", run.id);

    return Response.json({ run });
  } catch (error) {
    log.error("Request failed.", error);
    return handleRouteError(error, "Could not run automation.");
  }
}
