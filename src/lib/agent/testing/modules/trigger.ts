/**
 * 2. Trigger Simulator — the trigger is configured such that it can fire.
 *
 * Covers every canonical trigger kind (manual, webhook, form, schedule, event)
 * and therefore every integration that can start a workflow (Google Forms /
 * Sheets, Slack, Email, CRM, Stripe, Razorpay, generic webhook, manual).
 */

import type { TestIssue } from "../../models/testing";
import type { TestingContext } from "../context";

const CRON_RE = /^(\S+\s+){4}\S+$/;

export function testTrigger(ctx: TestingContext): TestIssue[] {
  const issues: TestIssue[] = [];
  const trigger = ctx.ir.core.trigger;

  switch (trigger.kind) {
    case "manual":
      // Always fireable — the user presses Run.
      break;

    case "webhook": {
      const event = trigger.config.event;
      if (!event || !event.trim()) {
        issues.push({
          code: "INVALID_TRIGGER_CONFIG",
          severity: "warning",
          module: "trigger",
          message: "Webhook trigger has no event name; it will accept any inbound payload.",
          affectedNode: "trigger",
          recommendation: "Name the webhook event so unrelated payloads are ignored.",
        });
      }
      break;
    }

    case "form": {
      const formId = trigger.config.formIdField;
      if (!formId || !formId.trim()) {
        issues.push({
          code: "INVALID_TRIGGER_CONFIG",
          severity: "error",
          module: "trigger",
          message: "Form trigger has no form identifier; it can never fire.",
          affectedNode: "trigger",
          recommendation: "Specify which form should trigger this workflow.",
        });
      }
      break;
    }

    case "schedule": {
      const cron = trigger.config.cron;
      if (!cron || !CRON_RE.test(cron.trim())) {
        issues.push({
          code: "INVALID_TRIGGER_CONFIG",
          severity: "error",
          module: "trigger",
          message: `Schedule trigger has an invalid cron expression: "${cron}".`,
          affectedNode: "trigger",
          recommendation: "Provide a 5-field cron expression, e.g. \"0 9 * * *\".",
        });
      }
      if (!trigger.config.timezone?.trim()) {
        issues.push({
          code: "INVALID_TRIGGER_CONFIG",
          severity: "warning",
          module: "trigger",
          message: "Schedule trigger has no timezone; UTC will be assumed.",
          affectedNode: "trigger",
          recommendation: "Set an explicit timezone for the schedule.",
        });
      }
      break;
    }

    case "event": {
      if (!trigger.config.eventName?.trim()) {
        issues.push({
          code: "INVALID_TRIGGER_CONFIG",
          severity: "error",
          module: "trigger",
          message: "Event trigger has no event name; it can never fire.",
          affectedNode: "trigger",
          recommendation: "Specify the event that should start this workflow.",
        });
      }
      if (!trigger.integration) {
        issues.push({
          code: "UNSUPPORTED_TRIGGER",
          severity: "error",
          module: "trigger",
          message: "Event trigger has no owning integration.",
          affectedNode: "trigger",
          recommendation: "Bind the event trigger to an integration.",
        });
      }
      break;
    }

    default: {
      // Unreachable for a well-formed IR (the canonical schema is a closed
      // union), but a hand-edited or migrated IR can carry an unknown kind —
      // simulating it would be guessing, so report instead.
      const unknown = (trigger as { kind?: unknown }).kind;
      issues.push({
        code: "UNSUPPORTED_TRIGGER",
        severity: "error",
        module: "trigger",
        message: `Trigger kind "${String(unknown)}" is not supported and cannot be simulated.`,
        affectedNode: "trigger",
        recommendation: "Regenerate the workflow with a supported trigger kind.",
      });
      break;
    }
  }

  // The trigger must actually produce the payload fields downstream nodes read.
  const triggerVars = ctx.ir.variables.filter((v) => v.producedBy === "trigger");
  const consumesTrigger = ctx.ir.mappings.some((m) => m.source === "trigger");
  if (consumesTrigger && triggerVars.length === 0) {
    issues.push({
      code: "INVALID_TRIGGER_CONFIG",
      severity: "error",
      module: "trigger",
      message: "Nodes read from the trigger payload, but the trigger declares no output fields.",
      affectedNode: "trigger",
      recommendation: "Regenerate the workflow so trigger outputs are declared.",
    });
  }

  return issues;
}
