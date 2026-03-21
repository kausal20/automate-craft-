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

/* LOGIC EXPLAINED:
This file runs an automation step by step. The earlier version worked, but it
did not tell you clearly which step started, which step finished, or where the
failure happened. These logs make the execution flow visible from start to end.
*/

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
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
  console.log("[execution-engine] Simulating step:", step.name);
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
  console.log("[execution-engine] Starting automation run.");
  console.log("[execution-engine] Automation:", input.automation.id);
  console.log("[execution-engine] Trigger source:", input.triggerSource);
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

  try {
    for (const step of input.automation.workflow.steps) {
      console.log("[execution-engine] Running step:", step.name);
      logs.push(logMessage(`Starting step: ${step.name}`, "info", step.name));

      const messages = await simulateStep(
        input.automation,
        step,
        input.automation.formInputs,
      );

      messages.forEach((message) => {
        logs.push(logMessage(message, "success", step.name));
      });
    }

    logs.push(logMessage("Automation completed successfully.", "success"));
    console.log("[execution-engine] Automation completed successfully.");

    return updateAutomationRun(createdRun.id, {
      status: "success",
      logs,
      result: {
        automationName: input.automation.name,
        processedSteps: input.automation.workflow.steps.length,
      },
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown execution error.";

    console.error("[execution-engine] Automation failed.", error);
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
  console.log("[execution-engine] Looking up automation for user run.");
  console.log("[execution-engine] User:", input.userId);
  console.log("[execution-engine] Automation:", input.automationId);
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
