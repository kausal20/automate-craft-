import { z } from "zod";
import { getWorkflowFieldDefinitions } from "@/lib/automation";
import { jsonError } from "@/lib/api";
import { generateWorkflowFromPrompt } from "@/lib/openai";

/* LOGIC EXPLAINED:
The homepage sends a prompt here and expects a workflow plus dynamic form
fields back. The old route worked, but it was hard to see whether the request
arrived, whether validation passed, or whether AI generation failed. These logs
show each step clearly.
*/

const promptSchema = z.object({
  prompt: z.string().min(5).max(500),
});

export async function POST(request: Request) {
  try {
    console.log("[api/generate-automation] Request received.");
    const { prompt } = promptSchema.parse(await request.json());
    console.log("[api/generate-automation] Prompt validated.");
    const generated = await generateWorkflowFromPrompt(prompt);
    const fieldDefinitions = getWorkflowFieldDefinitions(generated.workflow);
    console.log("[api/generate-automation] Workflow generated successfully.");

    return Response.json({
      workflow: generated.workflow,
      fieldDefinitions,
      source: generated.source,
    });
  } catch (error) {
    console.error("[api/generate-automation] Request failed.", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid prompt."
        : error instanceof Error
          ? error.message
          : "Could not generate automation.";

    return jsonError(message, 400);
  }
}
