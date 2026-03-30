import { z } from "zod";
import { getWorkflowFieldDefinitions } from "@/lib/automation";
import { handleRouteError } from "@/lib/api";
import { generateWorkflowFromPrompt } from "@/lib/openai";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits } from "@/lib/credit-store";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/generate-automation");

const promptSchema = z.object({
  prompt: z.string().min(5).max(500),
});

export async function POST(request: Request) {
  try {
    log.info("Request received.");
    const user = await getCurrentUser();

    if (!user) {
      log.warn("No authenticated user found.");
      return handleRouteError(new Error("Authentication required."), "Authentication required.", 401);
    }

    const { prompt } = promptSchema.parse(await request.json());
    log.debug("Prompt validated.");

    const success = await deductCredits(user.id, 5, "Generated Automation");
    if (!success) {
      log.warn("Not enough credits.");
      return handleRouteError(new Error("Not enough credits."), "Not enough credits.", 402);
    }
    const generated = await generateWorkflowFromPrompt(prompt);
    const fieldDefinitions = getWorkflowFieldDefinitions(generated.workflow);
    log.info("Workflow generated successfully.");

    return Response.json({
      workflow: generated.workflow,
      fieldDefinitions,
      source: generated.source,
    });
  } catch (error) {
    log.error("Request failed.", error);
    return handleRouteError(error, "Could not generate automation.");
  }
}
