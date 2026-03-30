import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  automationWorkflowSchema,
  buildDeterministicWorkflow,
} from "@/lib/automation";
import { env, hasOpenAIKey } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("openai");

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.openaiApiKey,
    });
  }

  return openaiClient;
}

const generationInstructions = `
You are an automation architect for a business automation SaaS.
Convert user prompts into a deterministic automation workflow that matches the provided schema.

Rules:
- Do not invent unrelated workflows or integrations.
- Base the trigger, steps, and required fields on the user's prompt only.
- Keep the trigger concise and business-relevant.
- Return between 2 and 6 steps.
- Only use these integrations: google, whatsapp, email, slack, hubspot, salesforce, stripe, webhook, forms, sheets, crm.
- Only use these requiredFields when needed: phoneNumber, message, formId, emailAddress, subject, sheetId, webhookUrl, leadSource, customerName, companyName.
- setupFields must be a user-facing dynamic form tailored to the prompt.
- setupFields should use specific labels like "Client WhatsApp number" or "Google Form connection" instead of vague generic names.
- setupFields keys must be short snake_case or kebab-case identifiers.
- setupFields should include the integration when the field belongs to a connected app.
- Prefer 2 to 8 setupFields, and do not duplicate the same question twice.
- details must be a flat object whose values are strings.
- Use steps that can be simulated safely by the platform.
- Prefer webhook or form-driven automations when the user describes an external event.
- For prompts that mention Google Forms and WhatsApp together, include fields for the form connection, the internal WhatsApp number, the submitter's WhatsApp field, and the greeting message content.
`;

export async function generateWorkflowFromPrompt(prompt: string) {
  log.info("Starting workflow generation.");
  log.debug("Prompt received:", prompt);

  if (!hasOpenAIKey()) {
    log.info("No OPENAI_API_KEY found. Using fallback generator.");
    return {
      workflow: buildDeterministicWorkflow(prompt),
      source: "fallback" as const,
    };
  }

  try {
    log.info("Using OpenAI model:", env.openaiModel);
    const openai = getOpenAIClient();
    const response = await openai.responses.parse({
      model: env.openaiModel,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: generationInstructions,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: {
        format: zodTextFormat(automationWorkflowSchema, "automation_workflow"),
      },
    });

    const workflow = automationWorkflowSchema.parse(response.output_parsed);
    log.info("Workflow generation succeeded in OpenAI mode.");

    return {
      workflow,
      source: "openai" as const,
    };
  } catch (error) {
    log.error("Workflow generation failed.", error);
    throw error;
  }
}
