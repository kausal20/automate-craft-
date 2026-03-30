import { findAutomationByWebhookId } from "@/lib/automation-store";
import { runAutomation } from "@/lib/execution-engine";
import { handleRouteError, jsonError } from "@/lib/api";
import { deductCredits } from "@/lib/credit-store";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/webhook");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!UUID_REGEX.test(id)) {
      log.warn("Invalid webhook id format:", id);
      return jsonError("Invalid webhook id.", 400);
    }

    log.info("Webhook triggered:", id);
    const automation = await findAutomationByWebhookId(id);

    if (!automation) {
      return jsonError("Webhook not found.", 404);
    }

    if (automation.status !== "active") {
      return jsonError("Automation is paused.", 409);
    }

    const payload =
      request.headers.get("content-type")?.includes("application/json")
        ? ((await request.json()) as Record<string, unknown>)
        : {};

    // Deduct unified credits
    const hasWhatsapp = automation.workflow.integrations.includes("whatsapp");
    const hasEmail = automation.workflow.integrations.includes("email");
    
    let creditsToDeduct = 1; // Base execution cost
    if (hasWhatsapp) creditsToDeduct += 2;
    if (hasEmail) creditsToDeduct += 1;
    if (automation.workflow.steps.some((s) => s.name.toLowerCase().includes("crm"))) {
      creditsToDeduct += 1;
    }

    const actionDesc = "Webhook Executed Automation";

    const success = await deductCredits(automation.userId, creditsToDeduct, actionDesc);
    if (!success) {
      log.warn(`Automation ${automation.id} failed: User ${automation.userId} out of credits.`);
      return jsonError("Not enough credits to run automation.", 402);
    }

    const run = await runAutomation({
      automation,
      payload,
      triggerSource: "webhook",
    });

    log.info("Webhook run completed:", run.id);
    return Response.json({ ok: true, run });
  } catch (error) {
    log.error("Webhook handling failed.", error);
    return handleRouteError(error, "Could not handle webhook.");
  }
}
