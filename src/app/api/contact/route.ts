import { z } from "zod";
import { jsonError } from "@/lib/api";
import { createConsultationRequest } from "@/lib/local-store";

/* LOGIC EXPLAINED:
The consultation form used to show a success state without sending data
anywhere. This route fixes that disconnect by validating the payload, storing
the request, and returning a real success response the UI can trust.
*/

const consultationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  company: z.string().trim().max(120).default(""),
  automationRequirement: z.string().trim().min(10).max(2000),
  budget: z.string().trim().min(2).max(80),
});

export async function POST(request: Request) {
  console.log("[api/contact] Request received.");

  try {
    const body = consultationSchema.parse(await request.json());
    console.log("[api/contact] Payload validated for:", body.email);
    const consultationRequest = await createConsultationRequest(body);
    console.log("[api/contact] Consultation request stored:", consultationRequest.id);

    return Response.json({
      consultationRequest,
      message: "Consultation request received.",
    });
  } catch (error) {
    console.error("[api/contact] Request failed.", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid consultation request."
        : error instanceof Error
          ? error.message
          : "Could not submit consultation request.";

    return jsonError(message, 400);
  }
}
