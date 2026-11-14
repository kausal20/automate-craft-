/**
 * POST /api/generate-automation
 *
 * Now a thin entry into the production agent: the single planner (Gemini →
 * deterministic fallback, catalogue-gated) produces a PREVIEW. Nothing is
 * built, charged or deployed here — building is step 2:
 * POST /api/agent/drafts/:id/confirm.
 *
 * Response:
 *   { agent: PreviewResponse }                       // always
 *   + legacy fields { workflow, ir, fieldDefinitions } // only when the plan has no open questions,
 *                                                      // so the existing setup screen keeps working
 * Rejected plans return 422 with a plain-language { error }.
 */

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getWorkflowFieldDefinitions as legacyFieldDefs } from "@/lib/automation";
import { createLogger } from "@/lib/logger";
import { projectWorkflowToLegacy } from "@/lib/workflow";
import { existingBuildPipeline, getAgentService, brainPlanToWorkflowPlan } from "@/lib/agent/production";
import { AgentUserError, toUserResponse } from "@/lib/agent/production/errors";

const log = createLogger("api/generate-automation");

const requestSchema = z.object({
  prompt: z.string().trim().min(5).max(2000),
  ultraThinking: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AgentUserError("unauthorized", 401, "no session");

    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) throw new AgentUserError("bad_request", 400, "invalid body");

    const service = getAgentService();
    const preview = await service.preview({ userId: user.id, prompt: parsed.data.prompt });

    if (preview.status === "rejected") {
      return Response.json({ error: preview.reason, agent: preview }, { status: 422 });
    }

    // Legacy projection for the existing setup screen — only for fully answered plans.
    if (preview.status !== "needs_input" && preview.draftId) {
      const draft = await service.getDraft(user.id, preview.draftId);
      if (draft.plan) {
        const wp = brainPlanToWorkflowPlan(draft.plan, { sessionId: draft.id, appsRequired: draft.appsRequired, now: Date.now() });
        const ir = existingBuildPipeline.generate(wp);
        const workflow = projectWorkflowToLegacy(ir.core);
        return Response.json({
          agent: preview,
          workflow,
          ir: ir.core,
          fieldDefinitions: legacyFieldDefs(workflow),
          source: "agent",
          cost: preview.costEstimate,
          warnings: [],
          metadata: { draftId: draft.id },
        });
      }
    }

    return Response.json({ agent: preview });
  } catch (error) {
    log.error("Request failed.", { name: error instanceof Error ? error.name : "unknown" });
    const { status, body } = toUserResponse(error);
    return Response.json(body, { status });
  }
}
