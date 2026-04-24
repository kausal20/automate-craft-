import { z } from "zod";
import { getWorkflowFieldDefinitions } from "@/lib/automation";
import { handleRouteError } from "@/lib/api";
import { generateWorkflowFromPrompt } from "@/lib/openai";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits, getUserCredits } from "@/lib/credit-store";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/generate-automation");

/* ─── Credits ───────────────────────────────────────────────────── */
const STANDARD_COST = 5;   // credits for normal generation
const ULTRA_COST    = 10;  // credits for Ultra Thinking generation

/* ─── Request schema ─────────────────────────────────────────────── */
const requestSchema = z.object({
  prompt:        z.string().min(5).max(500),
  ultraThinking: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    log.info("Request received.");

    // ── 1. Auth ──────────────────────────────────────────────────
    const user = await getCurrentUser();
    if (!user) {
      log.warn("No authenticated user found.");
      return handleRouteError(
        new Error("Authentication required."),
        "Authentication required.",
        401,
      );
    }

    // ── 2. Parse body ────────────────────────────────────────────
    const body = await request.json();
    const { prompt, ultraThinking } = requestSchema.parse(body);
    log.debug("Prompt validated. ultraThinking:", ultraThinking);

    // ── 3. Fetch user plan (needed for credit cost + prompt tier) ─
    const credits = await getUserCredits(user.id);
    const hasSubscription = credits.hasSubscription;

    // ── 4. Ultra Thinking gating ──────────────────────────────────
    //   Starter users CAN use Ultra Thinking — they just get a focused
    //   output and pay 10 credits instead of 5.
    //   (If you ever want to gate it behind Plus only, add a check here.)

    // ── 5. Deduct credits ─────────────────────────────────────────
    const creditCost = ultraThinking ? ULTRA_COST : STANDARD_COST;
    const modeLabel  = ultraThinking
      ? hasSubscription
        ? "Ultra Thinking (Plus)"
        : "Ultra Thinking (Starter)"
      : "Standard Generation";

    log.info(`Deducting ${creditCost} credits — ${modeLabel}`);
    const success = await deductCredits(user.id, creditCost, modeLabel);
    if (!success) {
      log.warn("Not enough credits.");
      return handleRouteError(
        new Error("Not enough credits."),
        "Not enough credits.",
        402,
      );
    }

    // ── 6. Generate ───────────────────────────────────────────────
    const generated = await generateWorkflowFromPrompt(prompt, {
      ultraThinking,
      hasSubscription,
    });

    const fieldDefinitions = getWorkflowFieldDefinitions(generated.workflow);
    log.info("Workflow generated successfully.");

    // ── 7. Respond ────────────────────────────────────────────────
    return Response.json({
      workflow:        generated.workflow,
      fieldDefinitions,
      source:          generated.source,
      ultraThinking:   generated.ultraThinking,
      creditCost,
      planTier:        hasSubscription ? "plus" : "starter",
    });
  } catch (error) {
    log.error("Request failed.", error);
    return handleRouteError(error, "Could not generate automation.");
  }
}
