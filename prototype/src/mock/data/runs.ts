import type { AutomationRecord, AutomationRunRecord, ExecutionLog } from "@/lib/automation";
import { minutesAgo } from "./time";

/** Failure messages cycled through seeded runs, written like real upstream errors. */
const FAILURES = [
  { step: "Send WhatsApp follow-up", message: "WhatsApp API returned 429: rate limit reached" },
  { step: "Append row to Google Sheet", message: "Sheet 'Leads Tracker' was not found or access was revoked" },
  { step: "Create or update CRM contact", message: "CRM request timed out after 30s" },
];

export function buildRunLogs(
  automation: AutomationRecord,
  startedAt: number,
  failure?: { step: string; message: string },
): ExecutionLog[] {
  const logs: ExecutionLog[] = [
    { at: new Date(startedAt).toISOString(), level: "info", message: `Trigger received: ${automation.workflow.trigger}`, stepName: "Trigger" },
  ];
  automation.workflow.steps.forEach((step, index) => {
    const at = new Date(startedAt + (index + 1) * 420).toISOString();
    if (failure && index === automation.workflow.steps.length - 1) {
      logs.push({ at, level: "error", message: failure.message, stepName: failure.step });
    } else {
      logs.push({ at, level: "success", message: step.details.description || `${step.name} completed`, stepName: step.name });
    }
  });
  return logs;
}

export function seedRuns(automations: AutomationRecord[]): AutomationRunRecord[] {
  const runs: AutomationRunRecord[] = [];

  automations.forEach((automation, automationIndex) => {
    const count = automation.status === "active" ? 9 - automationIndex : 3;

    for (let i = 0; i < count; i += 1) {
      const startedMinutesAgo = 25 + automationIndex * 53 + i * 311;
      const startedAt = Date.now() - startedMinutesAgo * 60_000;
      const failed = (i + automationIndex) % 6 === 4;
      const running = automationIndex === 0 && i === 0;
      const failure = failed ? FAILURES[(i + automationIndex) % FAILURES.length] : undefined;

      runs.push({
        id: `run-${automation.id.replace("auto-", "")}-${i + 1}`,
        automationId: automation.id,
        userId: automation.userId,
        status: running ? "running" : failed ? "error" : "success",
        logs: buildRunLogs(automation, startedAt, failure),
        triggerSource: i % 3 === 2 ? "manual" : "webhook",
        payload: { source: "demo", sequence: i + 1 },
        result: failed || running ? null : { delivered: true },
        errorMessage: failure?.message ?? null,
        createdAt: minutesAgo(startedMinutesAgo),
        finishedAt: running ? null : minutesAgo(startedMinutesAgo - 2),
      });
    }
  });

  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
