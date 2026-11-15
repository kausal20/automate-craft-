/**
 * POST /api/run-automation
 *
 * Manual run trigger. Refactored for Phase 3:
 *   - Routes through the runtime orchestrator when an active n8n
 *     deployment exists.
 *   - Falls back to the legacy local executor when no deployment
 *     exists (e.g. development without n8n configured).
 *
 * Credit accounting:
 *   - Deployed path: orchestrator handles reservation + refund via
 *     `manageCredits: true`.
 *   - Legacy path: reserve up front, refund in full if the run fails or throws
 *     (chargeForRun). Insufficient credits leave a plain note for the owner.
 */

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { runAutomationForUser } from "@/lib/execution-engine";
import { getAutomationByIdForUser } from "@/lib/automation-store";
import { getCreditService } from "@/lib/credits";
import { chargeForRun } from "@/lib/credits/run-guard";
import { handleRouteError, jsonError } from "@/lib/api";
import { createLogger } from "@/lib/logger";
import {
  enforceRateLimit,
  RateLimitError,
} from "@/lib/security";
import {
  estimateRunCost,
  getActiveDeployment,
  startRun,
} from "@/lib/execution";
import {
  AutomationNotFoundError,
  isWorkflowError,
} from "@/lib/workflow";

const log = createLogger("api/run-automation");

const runSchema = z.object({
  automationId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return handleRouteError(
        new Error("Authentication required."),
        "Authentication required.",
        401,
      );
    }

    /* ── Rate limit ──────────────────────────────────────────── */
    try {
      await enforceRateLimit({ name: "run-automation", identifier: user.id });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return Response.json(error.toApiPayload(), { status: 429 });
      }
      throw error;
    }

    const body = runSchema.parse(await request.json());

    const automation = await getAutomationByIdForUser(user.id, body.automationId);
    if (!automation) {
      return jsonError("Automation not found.", 404);
    }

    /* ── Routing: deployed (orchestrator) or legacy ─────────── */
    const deployment = await getActiveDeployment({
      automationId: body.automationId,
      adapter: "n8n",
    });

    if (deployment) {
      let outcome;
      try {
        outcome = await startRun({
          automationId: body.automationId,
          userId: user.id,
          triggerKind: "manual",
          rawPayload: body.payload,
          manageCredits: true,
        });
      } catch (error) {
        if (error instanceof Error && /insufficient credits/i.test(error.message)) {
          await getCreditService().recordBlocked(user.id, automation.workflow.name);
          return jsonError("Not enough credits.", 402);
        }
        throw error;
      }
      log.info("Manual run handed to orchestrator.", { runId: outcome.runId });
      return Response.json({
        runId: outcome.runId,
        creditsCharged: outcome.creditsCharged,
        mode: "deployed",
      });
    }

    /* ── Legacy fallback (no deployment) ────────────────────── */
    log.info("No deployment found — using legacy local executor.");
    try {
      const cost = await estimateLegacyCost(body.automationId);
      const charged = await chargeForRun({
        userId: user.id,
        amount: cost,
        referenceId: `legacy-run:${crypto.randomUUID()}`,
        description: "Executed Automation",
        automationName: automation.workflow.name,
        run: () =>
          runAutomationForUser({
            userId: user.id,
            automationId: body.automationId,
            payload: body.payload,
            triggerSource: "manual",
          }),
        succeeded: (run) => run.status === "success",
      });
      if (!charged.ok) {
        return jsonError(charged.reason === "insufficient" ? "Not enough credits." : "Could not reserve credits.", 402);
      }
      return Response.json({ run: charged.result, mode: "legacy" });
    } catch (error) {
      if (error instanceof AutomationNotFoundError) {
        return jsonError(error.message, 404);
      }
      throw error;
    }
  } catch (error) {
    log.error("Request failed.", error);
    if (isWorkflowError(error)) {
      return Response.json(error.toApiPayload(), { status: error.httpStatus });
    }
    return handleRouteError(error, "Could not run automation.");
  }
}

/**
 * Legacy cost estimator — used when no workflow_version exists for an
 * automation. Mirrors the pre-Phase-1 heuristic.
 */
async function estimateLegacyCost(automationId: string): Promise<number> {
  try {
    const estimate = await estimateRunCost({ automationId });
    return estimate.cost.total;
  } catch {
    // Pre-Phase-1 automation with no version row — fall back to a
    // hard-coded base.
    return 1;
  }
}
