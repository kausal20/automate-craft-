/**
 * POST /api/webhook/[id]
 *
 * Inbound webhook endpoint for an automation. Refactored for Phase 2:
 *   1. Look up automation by webhook_id.
 *   2. Rate-limit per webhook_id.
 *   3. Verify HMAC signature when the trigger declares `verifySecretRef`
 *      (signature optional otherwise — frontend webhooks may not sign).
 *   4. Deduct credits.
 *   5. Hand off to runtime orchestrator (fire-and-forget for n8n path).
 *   6. Return 200 immediately with the run id.
 *
 * The legacy local executor path remains as a fallback when no
 * deployment exists for the automation (development without n8n).
 */

import { findAutomationByWebhookId } from "@/lib/automation-store";
import { handleRouteError, jsonError } from "@/lib/api";
import { getCreditService } from "@/lib/credits";
import { chargeForRun } from "@/lib/credits/run-guard";
import { createLogger } from "@/lib/logger";
import { enforceRateLimit, RateLimitError } from "@/lib/security";
import {
  normalizeHeaders,
  verifyIncomingWebhook,
} from "@/lib/security";
import { startRun } from "@/lib/execution";
import { getActiveDeployment } from "@/lib/execution";
import { getActiveVersion } from "@/lib/workflow-store";
import { runAutomation } from "@/lib/execution-engine";
import { calculateExecutionCost } from "@/lib/workflow";

const log = createLogger("api/webhook");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return jsonError("Invalid webhook id.", 400);
    }

    /* ── Rate limit per webhook_id ──────────────────────────── */
    try {
      await enforceRateLimit({ name: "webhook-receive", identifier: id });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return Response.json(error.toApiPayload(), { status: 429 });
      }
      throw error;
    }

    log.info("Webhook triggered.", { webhookId: id });

    const automation = await findAutomationByWebhookId(id);
    if (!automation) {
      return jsonError("Webhook not found.", 404);
    }
    if (automation.status !== "active") {
      return jsonError("Automation is paused.", 409);
    }

    /* ── Read body once (raw + parsed) ──────────────────────── */
    const rawBody = await request.text();
    const headers = normalizeHeaders(request.headers);
    const parsedBody: Record<string, unknown> = rawBody
      ? safeParseJson(rawBody, headers["content-type"])
      : {};

    /* ── Optional signature verification ────────────────────── */
    const version = await getActiveVersion(automation.id);
    const trigger = version?.workflow.trigger;
    if (
      trigger?.kind === "webhook" &&
      "verifySecretRef" in trigger.config &&
      trigger.config.verifySecretRef
    ) {
      const verifyResult = await verifyIncomingWebhook({
        rawBody,
        headers,
        integration: trigger.integration,
        vaultUserId: automation.userId,
        vaultIntegration: trigger.integration ?? "webhook",
        vaultSecretName: trigger.config.verifySecretRef,
      });
      if (!verifyResult.valid) {
        log.warn("Webhook signature verification failed.", {
          webhookId: id,
          reason: verifyResult.reason,
        });
        return jsonError(`Webhook verification failed: ${verifyResult.reason}`, 401);
      }
    }

    /* ── Cost + credit check ─────────────────────────────────── */
    const cost = version
      ? calculateExecutionCost(version.workflow).total
      : legacyCost(automation);
    /* ── Deployment-driven path (Phase 2) or legacy fallback ─ */
    const deployment = await getActiveDeployment({
      automationId: automation.id,
      adapter: "n8n",
    });

    if (deployment && version) {
      // Phase 2: hand off to the runtime orchestrator. It reserves credits under
      // the run id and settles on the final state (completed steps kept, rest refunded).
      let outcome;
      try {
        outcome = await startRun({
          automationId: automation.id,
          userId: automation.userId,
          triggerKind: "webhook",
          rawPayload: parsedBody,
          manageCredits: true,
        });
      } catch (error) {
        if (error instanceof Error && /insufficient credits/i.test(error.message)) {
          await getCreditService().recordBlocked(automation.userId, automation.workflow.name);
          return jsonError("Not enough credits to run automation.", 402);
        }
        throw error;
      }
      log.info("Webhook handed to orchestrator.", { runId: outcome.runId });
      return Response.json({ ok: true, runId: outcome.runId, mode: "deployed" });
    }

    /* Legacy local executor (no n8n deployment yet): full refund if it fails. */
    const charged = await chargeForRun({
      userId: automation.userId,
      amount: cost,
      referenceId: `webhook-run:${crypto.randomUUID()}`,
      description: "Webhook Executed Automation",
      automationName: automation.workflow.name,
      run: () => runAutomation({ automation, payload: parsedBody, triggerSource: "webhook" }),
      succeeded: (run) => run.status === "success",
    });
    if (!charged.ok) {
      return jsonError("Not enough credits to run automation.", 402);
    }
    return Response.json({ ok: true, run: charged.result, mode: "legacy" });
  } catch (error) {
    log.error("Webhook handling failed.", error);
    return handleRouteError(error, "Could not handle webhook.");
  }
}

function safeParseJson(body: string, contentType: string | undefined): Record<string, unknown> {
  if (!contentType || !contentType.includes("application/json")) {
    return {};
  }
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function legacyCost(automation: { workflow: { integrations: readonly string[]; steps: readonly { name: string }[] } }): number {
  let cost = 1;
  if (automation.workflow.integrations.includes("whatsapp")) cost += 2;
  if (automation.workflow.integrations.includes("email")) cost += 1;
  if (automation.workflow.steps.some((s) => s.name.toLowerCase().includes("crm"))) {
    cost += 1;
  }
  return cost;
}
