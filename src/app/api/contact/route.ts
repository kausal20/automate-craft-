import { z } from "zod";
import { handleRouteError } from "@/lib/api";
import { createConsultationRequest } from "@/lib/local-store";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/contact");

const consultationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  company: z.string().trim().max(120).default(""),
  automationRequirement: z.string().trim().min(10).max(2000),
  budget: z.string().trim().min(2).max(80),
});

export async function POST(request: Request) {
  log.info("Request received.");

  try {
    const body = consultationSchema.parse(await request.json());
    log.debug("Payload validated for:", body.email);
    const consultationRequest = await createConsultationRequest(body);
    log.info("Consultation request stored:", consultationRequest.id);

    return Response.json({
      consultationRequest,
      message: "Consultation request received.",
    });
  } catch (error) {
    log.error("Request failed.", error);
    return handleRouteError(error, "Could not submit consultation request.");
  }
}
