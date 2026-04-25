import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { appendRow } from "@/lib/google-sheets";
import {
  createWorkflowRun,
  completeWorkflowRun,
  createStepLog,
} from "@/lib/workflow-run-store";
import {
  checkCredits,
  deductWorkflowCredits,
  calculateWorkflowCost,
  type CreditDeductionResult,
} from "@/lib/workflow-credits";

/* LOGIC EXPLAINED:
This route accepts a workflow, runs each step one by one, and returns the
result of every step. The logic is intentionally simple: validate the input,
loop through the steps in order, run a small handler for each supported step
type, and stop immediately if one step fails. This keeps the API predictable
and easy to debug while the product foundation is still being built.
*/

const log = createLogger("api/run-workflow");

const stepSchema = z.object({
  type: z.string().min(1, "Step type is required."),
  config: z.record(z.string(), z.unknown()).default({}),
});

const stepsSchema = z.array(stepSchema).min(1, "Workflow must include at least one step.");

const requestSchema = z
  .object({
    workflow: z
      .object({
        steps: stepsSchema,
      })
      .optional(),
    steps: stepsSchema.optional(),
    userId: z.string().min(1).optional(),
    workflowId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.workflow?.steps || value.steps), {
    message: "Workflow steps are required.",
  });

type WorkflowStep = z.infer<typeof stepSchema>;

type StepResult = {
  step: string;
  status: "success" | "fail";
  output: unknown;
};

function getStringConfig(step: WorkflowStep, key: string): string | undefined {
  const value = step.config[key];

  return typeof value === "string" ? value : undefined;
}

function getNumberConfig(step: WorkflowStep, key: string): number | undefined {
  const value = step.config[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStepName(step: WorkflowStep, index: number): string {
  const configuredName = getStringConfig(step, "name");

  if (configuredName) {
    return configuredName;
  }

  return `Step ${index + 1}: ${step.type}`;
}

function waitForDelay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function runStep(step: WorkflowStep) {
  switch (step.type) {
    case "log": {
      const message = getStringConfig(step, "message") || "Log step completed.";
      log.info("Workflow log step:", message);
      return { message };
    }

    case "delay": {
      const configuredMs = getNumberConfig(step, "ms") ?? 1000;
      const safeMs = Math.max(0, Math.min(configuredMs, 10000));

      await waitForDelay(safeMs);

      return { waitedMs: safeMs };
    }

    case "mock_action": {
      const actionName = getStringConfig(step, "action") || "Mock action";
      const message = `${actionName} completed successfully.`;

      log.info("Workflow mock action step:", actionName);
      return { message };
    }

    case "google_sheets.append_row": {
      const sheetId = getStringConfig(step, "sheetId");
      const accessToken = getStringConfig(step, "accessToken");
      const rawValues = step.config.values;

      if (!sheetId) {
        throw new Error("google_sheets.append_row requires a \"sheetId\" in config.");
      }

      if (!accessToken) {
        throw new Error("google_sheets.append_row requires an \"accessToken\" in config.");
      }

      if (!Array.isArray(rawValues) || rawValues.length === 0) {
        throw new Error("google_sheets.append_row requires a non-empty \"values\" array in config.");
      }

      const values = rawValues.map((v) => String(v));
      const result = await appendRow(accessToken, sheetId, values);

      log.info("Google Sheets append_row step completed.", result);

      return {
        updatedRange: result.updatedRange,
        updatedRows: result.updatedRows,
        message: result.message,
      };
    }

    default:
      throw new Error(`Unsupported step type: ${step.type}`);
  }
}

export async function POST(request: Request) {
  const stepResults: StepResult[] = [];
  let runRecord: Awaited<ReturnType<typeof createWorkflowRun>> | null = null;
  let creditResult: CreditDeductionResult | null = null;

  log.info("Request received.");

  try {
    const body = requestSchema.parse(await request.json());
    const steps = body.workflow?.steps ?? body.steps ?? [];

    log.debug("Workflow execution started.", {
      userId: body.userId ?? "anonymous",
      stepCount: steps.length,
    });

    // --- Create workflow run record ---
    try {
      runRecord = await createWorkflowRun({
        userId: body.userId ?? null,
        workflowId: body.workflowId ?? null,
      });
      log.info("Workflow run created.", { runId: runRecord.id });
    } catch (trackingError) {
      // Logging failure should not block execution
      log.warn("Could not create workflow run record.", trackingError);
    }

    // --- Credit gate: check & deduct before execution ---
    if (body.userId) {
      const creditCheck = await checkCredits(body.userId, steps.length);

      if (!creditCheck.allowed) {
        log.warn("Workflow blocked: insufficient credits.", {
          userId: body.userId,
          cost: creditCheck.cost,
          available: creditCheck.currentCredits,
        });

        // Mark the run as failed if it was created
        if (runRecord) {
          try {
            await completeWorkflowRun(runRecord.id, "failed");
          } catch (completeError) {
            log.warn("Could not finalize failed workflow run.", completeError);
          }
        }

        return Response.json(
          {
            success: false,
            runId: runRecord?.id ?? null,
            steps: [],
            error: creditCheck.error,
            creditsRequired: creditCheck.cost,
            creditsAvailable: creditCheck.currentCredits,
          },
          { status: 402 },
        );
      }

      // Deduct credits
      creditResult = await deductWorkflowCredits({
        userId: body.userId,
        cost: creditCheck.cost,
        referenceId: runRecord?.id ?? null,
      });

      if (!creditResult.success) {
        log.error("Credit deduction failed after check passed.", creditResult);

        if (runRecord) {
          try {
            await completeWorkflowRun(runRecord.id, "failed");
          } catch (completeError) {
            log.warn("Could not finalize failed workflow run.", completeError);
          }
        }

        return Response.json(
          {
            success: false,
            runId: runRecord?.id ?? null,
            steps: [],
            error: creditResult.error ?? "Credit deduction failed.",
            creditsRequired: creditResult.cost,
            creditsAvailable: creditResult.remainingCredits,
          },
          { status: 402 },
        );
      }

      log.info("Credits deducted.", {
        cost: creditResult.cost,
        remaining: creditResult.remainingCredits,
      });
    }

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const stepName = getStepName(step, index);

      try {
        log.info("Running workflow step.", { step: stepName, type: step.type });

        const output = await runStep(step);

        stepResults.push({
          step: stepName,
          status: "success",
          output,
        });

        // --- Log successful step ---
        if (runRecord) {
          try {
            await createStepLog({
              runId: runRecord.id,
              stepName,
              status: "success",
              output,
            });
          } catch (logError) {
            log.warn("Could not log step result.", logError);
          }
        }
      } catch (stepError) {
        const message =
          stepError instanceof Error ? stepError.message : "Workflow step failed.";

        log.error("Workflow step failed.", {
          step: stepName,
          error: stepError,
        });

        stepResults.push({
          step: stepName,
          status: "fail",
          output: message,
        });

        // --- Log failed step ---
        if (runRecord) {
          try {
            await createStepLog({
              runId: runRecord.id,
              stepName,
              status: "failed",
              error: message,
            });
          } catch (logError) {
            log.warn("Could not log step failure.", logError);
          }
        }

        // --- Mark run as failed ---
        if (runRecord) {
          try {
            await completeWorkflowRun(runRecord.id, "failed");
          } catch (completeError) {
            log.warn("Could not finalize failed workflow run.", completeError);
          }
        }

        return Response.json(
          {
            success: false,
            runId: runRecord?.id ?? null,
            steps: stepResults,
            error: message,
            creditsUsed: creditResult?.cost ?? 0,
            remainingCredits: creditResult?.remainingCredits ?? null,
          },
          { status: 400 },
        );
      }
    }

    log.info("Workflow execution finished successfully.");

    // --- Mark run as success ---
    if (runRecord) {
      try {
        await completeWorkflowRun(runRecord.id, "success");
      } catch (completeError) {
        log.warn("Could not finalize successful workflow run.", completeError);
      }
    }

    return Response.json({
      success: true,
      runId: runRecord?.id ?? null,
      steps: stepResults,
      creditsUsed: creditResult?.cost ?? 0,
      remainingCredits: creditResult?.remainingCredits ?? null,
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message || "Invalid workflow payload."
        : error instanceof Error
          ? error.message
          : "Could not run workflow.";

    log.error("Workflow request failed.", error);

    // --- Mark run as failed on unexpected error ---
    if (runRecord) {
      try {
        await completeWorkflowRun(runRecord.id, "failed");
      } catch (completeError) {
        log.warn("Could not finalize errored workflow run.", completeError);
      }
    }

    return Response.json(
      {
        success: false,
        runId: runRecord?.id ?? null,
        steps: stepResults,
        error: message,
        creditsUsed: creditResult?.cost ?? 0,
        remainingCredits: creditResult?.remainingCredits ?? null,
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
