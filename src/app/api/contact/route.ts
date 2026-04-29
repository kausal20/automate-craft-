import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
} from "@/lib/supabase";
import { handleRouteError } from "@/lib/api";
import { isSupabaseAuthEnabled, isSupabaseMode } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/contact");

/* LOGIC EXPLAINED:
The contact API used to save a much larger consultation payload into local
storage. The website already posts to /api/contact, so this route now keeps
that same endpoint but stores a simple name/email/message record in Supabase.
To avoid breaking the current UI, the route accepts both a direct `message`
field and the existing consultation-form fields, then converts them into one
plain message string before inserting into `contact_requests`.
*/

const contactRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.email("A valid email is required."),
  message: z.string().trim().optional().default(""),
  company: z.string().trim().optional().default(""),
  role: z.string().trim().optional().default(""),
  businessType: z.string().trim().optional().default(""),
  companySize: z.string().trim().optional().default(""),
  volume: z.string().trim().optional().default(""),
  automationGoal: z.string().trim().optional().default(""),
  toolsUsed: z.array(z.string()).optional().default([]),
  bottleneck: z.string().trim().optional().default(""),
  usedAutomation: z.boolean().nullable().optional(),
  previousTools: z.string().trim().optional().default(""),
  complexity: z.string().trim().optional().default(""),
  urgency: z.string().trim().optional().default(""),
  budget: z.string().trim().optional().default(""),
  additionalInfo: z.string().trim().optional().default(""),
});

function buildMessage(input: z.infer<typeof contactRequestSchema>) {
  if (input.message) {
    return input.message;
  }

  const sections = [
    ["Company", input.company],
    ["Role", input.role],
    ["Business type", input.businessType],
    ["Company size", input.companySize],
    ["Volume", input.volume],
    ["Automation goal", input.automationGoal],
    ["Tools used", input.toolsUsed.join(", ")],
    ["Biggest bottleneck", input.bottleneck],
    [
      "Used automation before",
      input.usedAutomation === null || typeof input.usedAutomation === "undefined"
        ? ""
        : input.usedAutomation
          ? "Yes"
          : "No",
    ],
    ["Previous tools", input.previousTools],
    ["Complexity", input.complexity],
    ["Urgency", input.urgency],
    ["Budget", input.budget],
    ["Additional info", input.additionalInfo],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);

  return sections.join("\n");
}

export async function POST(request: Request) {
  log.info("Contact request received.");

  try {
    if (!isSupabaseAuthEnabled()) {
      throw new Error("Supabase is not configured.");
    }

    const payload = contactRequestSchema.parse(await request.json());
    const message = buildMessage(payload).trim();

    if (!message) {
      throw new Error("Message is required.");
    }

    const supabase = isSupabaseMode()
      ? createSupabaseAdminClient()
      : await createSupabaseRouteClient();
    const { error } = await supabase.from("contact_requests").insert({
      name: payload.name,
      email: payload.email,
      message,
    });

    if (error) {
      log.error("Supabase insert failed.", error);
      throw new Error("Could not save contact request.");
    }

    log.info("Contact request stored for:", payload.email);

    return Response.json({
      success: true,
      message: "Contact request received successfully.",
    });
  } catch (error) {
    log.error("Contact request failed.", error);
    const status =
      error instanceof z.ZodError ||
      (error instanceof Error && error.message === "Message is required.")
        ? 400
        : 500;

    return handleRouteError(error, "Could not submit contact request.", status);
  }
}
