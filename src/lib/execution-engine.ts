import {
  createAutomationRun,
  getAutomationByIdForUser,
  updateAutomationRun,
} from "@/lib/automation-store";
import type {
  AutomationRecord,
  AutomationRunRecord,
  ExecutionLog,
} from "@/lib/automation";
import { createLogger } from "@/lib/logger";

const log = createLogger("execution-engine");

const STEP_TIMEOUT_MS = 5_000;
const TOTAL_RUN_TIMEOUT_MS = 30_000;

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Step "${label}" timed out after ${ms}ms.`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function logMessage(
  message: string,
  level: ExecutionLog["level"] = "info",
  stepName?: string,
): ExecutionLog {
  return {
    at: new Date().toISOString(),
    level,
    message,
    stepName,
  };
}

async function simulateStep(
  automation: AutomationRecord,
  step: AutomationRecord["workflow"]["steps"][number],
  formInputs: Record<string, string>,
) {
  log.debug("Simulating step:", step.name);
  const normalizedName = step.name.toLowerCase();
  const messages: string[] = [];

  if (normalizedName.includes("whatsapp")) {
    messages.push(
      `Simulated WhatsApp message to ${formInputs.phoneNumber || "configured recipient"}.`,
    );
  } else if (normalizedName.includes("email")) {
    messages.push(
      `Simulated email send to ${formInputs.emailAddress || "configured email address"}.`,
    );
  } else if (normalizedName.includes("sheet")) {
    messages.push(
      `Simulated save to ${formInputs.sheetId || "selected Google Sheet"}.`,
    );
  } else if (normalizedName.includes("crm")) {
    messages.push("Simulated CRM create/update action.");
  } else if (normalizedName.includes("webhook")) {
    messages.push(
      `Simulated outbound webhook call to ${formInputs.webhookUrl || "target endpoint"}.`,
    );
  } else {
    messages.push(
      `Simulated ${step.type} step for automation "${automation.name}".`,
    );
  }

  await wait(120);
  return messages;
}

export async function runAutomation(input: {
  automation: AutomationRecord;
  payload?: Record<string, unknown>;
  triggerSource: AutomationRunRecord["triggerSource"];
}) {
  log.info("Starting automation run.", input.automation.id);
  const logs: ExecutionLog[] = [
    logMessage(
      `Execution started from ${input.triggerSource === "webhook" ? "webhook" : "manual"} trigger.`,
    ),
  ];

  const createdRun = await createAutomationRun({
    automationId: input.automation.id,
    userId: input.automation.userId,
    status: "running",
    logs,
    triggerSource: input.triggerSource,
    payload: input.payload ?? {},
    result: null,
    errorMessage: null,
    finishedAt: null,
  });

  const runStart = Date.now();
  let failedStepCount = 0;

  try {
    for (const step of input.automation.workflow.steps) {
      // Check total run timeout
      if (Date.now() - runStart > TOTAL_RUN_TIMEOUT_MS) {
        logs.push(logMessage("Total run timeout exceeded. Stopping execution.", "error"));
        break;
      }

      log.debug("Running step:", step.name);
      logs.push(logMessage(`Starting step: ${step.name}`, "info", step.name));

      try {
        const messages = await withTimeout(
          simulateStep(input.automation, step, input.automation.formInputs),
          STEP_TIMEOUT_MS,
          step.name,
        );

        messages.forEach((message) => {
          logs.push(logMessage(message, "success", step.name));
        });
      } catch (stepError) {
        failedStepCount++;
        const stepMessage =
          stepError instanceof Error ? stepError.message : "Unknown step error.";
        log.warn("Step failed:", step.name, stepMessage);
        logs.push(logMessage(`Step failed: ${stepMessage}`, "error", step.name));
        // Continue to next step instead of aborting
      }
    }

    const totalSteps = input.automation.workflow.steps.length;
    const allFailed = failedStepCount === totalSteps;

    if (allFailed) {
      logs.push(logMessage("All steps failed.", "error"));
      log.error("Automation completed with all steps failed.");
      return updateAutomationRun(createdRun.id, {
        status: "error",
        logs,
        errorMessage: "All steps failed.",
        finishedAt: new Date().toISOString(),
      });
    }

    if (failedStepCount > 0) {
      logs.push(
        logMessage(
          `Automation completed with ${failedStepCount}/${totalSteps} step(s) failed.`,
          "info",
        ),
      );
    } else {
      logs.push(logMessage("Automation completed successfully.", "success"));
    }

    log.info("Automation completed.", { failedStepCount, totalSteps });

    return updateAutomationRun(createdRun.id, {
      status: "success",
      logs,
      result: {
        automationName: input.automation.name,
        processedSteps: totalSteps,
        failedSteps: failedStepCount,
      },
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown execution error.";

    log.error("Automation failed unexpectedly.", error);
    logs.push(logMessage(message, "error"));

    return updateAutomationRun(createdRun.id, {
      status: "error",
      logs,
      errorMessage: message,
      finishedAt: new Date().toISOString(),
    });
  }
}

export async function runAutomationForUser(input: {
  userId: string;
  automationId: string;
  payload?: Record<string, unknown>;
  triggerSource: AutomationRunRecord["triggerSource"];
}) {
  log.info("Looking up automation for user run.", input.automationId);
  const automation = await getAutomationByIdForUser(input.userId, input.automationId);

  if (!automation) {
    throw new Error("Automation not found.");
  }

  if (automation.status !== "active") {
    throw new Error("Only active automations can run.");
  }

  return runAutomation({
    automation,
    payload: input.payload,
    triggerSource: input.triggerSource,
  });
}
