import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  automationConfigSchema,
  connectionStatusSchema,
  getWorkflowFieldDefinitions,
} from "@/lib/automation";
import {
  deleteAutomationForUser,
  getAutomationByIdForUser,
  updateAutomationForUser,
} from "@/lib/automation-store";
import { jsonError } from "@/lib/api";

/* LOGIC EXPLAINED:
This route is used by the automation detail page for load, save, and delete.
The main fix is visibility: each branch now logs the automation id, auth state,
and result so it is easy to see which action worked and where it failed.
*/

const patchSchema = z
  .object({
    status: z.enum(["active", "paused"]).optional(),
    name: z.string().min(3).max(120).optional(),
    formInputs: automationConfigSchema.optional(),
    integrationStatus: z.record(z.string(), connectionStatusSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one automation field must be updated.",
  });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  console.log("[api/automations/:id] GET request received.");
  const user = await getCurrentUser();

  if (!user) {
    console.log("[api/automations/:id] GET failed because no user was found.");
    return jsonError("Authentication required.", 401);
  }

  try {
    const { id } = await context.params;
    console.log("[api/automations/:id] Loading automation:", id);
    const automation = await getAutomationByIdForUser(user.id, id);

    if (!automation) {
      return jsonError("Automation not found.", 404);
    }

    return Response.json({
      automation,
      fieldDefinitions: getWorkflowFieldDefinitions(automation.workflow),
    });
  } catch (error) {
    console.error("[api/automations/:id] GET failed.", error);
    return jsonError(
      error instanceof Error ? error.message : "Could not load automation.",
      400,
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  console.log("[api/automations/:id] PATCH request received.");
  const user = await getCurrentUser();

  if (!user) {
    console.log("[api/automations/:id] PATCH failed because no user was found.");
    return jsonError("Authentication required.", 401);
  }

  try {
    const { id } = await context.params;
    console.log("[api/automations/:id] Updating automation:", id);
    const body = patchSchema.parse(await request.json());
    console.log("[api/automations/:id] PATCH payload validated.");
    const automation = await updateAutomationForUser({
      userId: user.id,
      automationId: id,
      patch: body,
    });

    if (!automation) {
      return jsonError("Automation not found.", 404);
    }

    return Response.json({ automation });
  } catch (error) {
    console.error("[api/automations/:id] PATCH failed.", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid update."
        : error instanceof Error
          ? error.message
          : "Could not update automation.";

    return jsonError(message, 400);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  console.log("[api/automations/:id] DELETE request received.");
  const user = await getCurrentUser();

  if (!user) {
    console.log("[api/automations/:id] DELETE failed because no user was found.");
    return jsonError("Authentication required.", 401);
  }

  try {
    const { id } = await context.params;
    console.log("[api/automations/:id] Deleting automation:", id);
    const deleted = await deleteAutomationForUser(user.id, id);

    if (!deleted) {
      return jsonError("Automation not found.", 404);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[api/automations/:id] DELETE failed.", error);
    return jsonError(
      error instanceof Error ? error.message : "Could not delete automation.",
      400,
    );
  }
}
