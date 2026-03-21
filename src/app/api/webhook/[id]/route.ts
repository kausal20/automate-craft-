import { findAutomationByWebhookId } from "@/lib/automation-store";
import { runAutomation } from "@/lib/execution-engine";
import { jsonError } from "@/lib/api";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
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

    const run = await runAutomation({
      automation,
      payload,
      triggerSource: "webhook",
    });

    return Response.json({ ok: true, run });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not handle webhook.",
      400,
    );
  }
}
