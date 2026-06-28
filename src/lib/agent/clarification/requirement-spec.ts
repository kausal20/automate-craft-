/**
 * Requirement derivation — catalog-driven, NOT regex-driven.
 *
 * Given an AutomationIntent, derive the set of BLOCKING requirements the
 * user must clarify before a workflow can be planned. Requirements come
 * from two deterministic sources:
 *
 *   1. Trigger source — from `intent.triggerConcept`. A form/sheet/webhook
 *      trigger needs its source identified; a schedule needs a cadence.
 *
 *   2. Per-integration user-config params — for each integration in the
 *      intent, we read the operation catalog (`operationsForIntegration`),
 *      union the `requiredParams` across that integration's operations,
 *      and intersect with USER_CONFIG_PARAMS — the closed set of params
 *      that only a human can supply (a channel, a recipient, a sheet id).
 *      Data-flow params (input, body, email, amount, …) are NOT asked:
 *      the planner resolves them from the trigger payload / upstream steps.
 *
 * This is the core of "catalog-driven": adding an operation with a new
 * user-config requiredParam automatically produces a clarification
 * question, with zero new regex.
 */

import {
  operationsForIntegration,
  type SupportedIntegration,
} from "@/lib/workflow";
import type { AutomationIntent } from "../models/intent";
import type { ClarificationValueType } from "../models/clarification";

export interface DerivedRequirement {
  /** `<integration>.<param>` | `trigger.source` | `trigger.schedule` | `integration.<role>`. */
  requirementKey: string;
  prompt: string;
  valueType: ClarificationValueType;
  blocking: boolean;
  options?: string[];
}

/**
 * Closed set of catalog param keys a HUMAN must supply. Anything not here
 * is a data-flow param resolved during planning. The valueType + prompt
 * may be refined per-integration by `configRequirement()`.
 */
const USER_CONFIG_PARAMS = new Set(["channel", "to", "sheet", "folder_id"]);

/** Generic integration slugs that must be disambiguated to a concrete one. */
const GENERIC_INTEGRATIONS: Partial<
  Record<SupportedIntegration, { role: string; prompt: string; options: string[] }>
> = {
  crm: {
    role: "crm",
    prompt: "Which CRM should this connect to?",
    options: ["hubspot", "salesforce"],
  },
};

/** Build the per-(integration, param) config requirement. */
function configRequirement(
  integration: SupportedIntegration,
  param: string,
): DerivedRequirement | null {
  const key = `${integration}.${param}`;

  if (param === "channel") {
    return {
      requirementKey: key,
      prompt: `Which ${labelFor(integration)} channel should receive this? Share the #channel or its name.`,
      valueType: "channel",
      blocking: true,
    };
  }

  if (param === "to") {
    // "to" means different things per integration.
    if (integration === "whatsapp") {
      return {
        requirementKey: key,
        prompt: "Who should receive the WhatsApp message? Share the phone number or group name.",
        valueType: "phone",
        blocking: true,
      };
    }
    if (integration === "email") {
      return {
        requirementKey: key,
        prompt: "Which email address should receive the message?",
        valueType: "email",
        blocking: true,
      };
    }
    return {
      requirementKey: key,
      prompt: `Who/what is the destination for ${labelFor(integration)}?`,
      valueType: "text",
      blocking: true,
    };
  }

  if (param === "sheet") {
    return {
      requirementKey: key,
      prompt: "Which Google Sheet should I use? Share the sheet name or URL.",
      valueType: "identifier",
      blocking: true,
    };
  }

  if (param === "folder_id") {
    return {
      requirementKey: key,
      prompt: "Which Drive folder should files go to? Share the folder name or URL.",
      valueType: "identifier",
      blocking: true,
    };
  }

  return null;
}

/** Trigger-source requirement from the detected trigger concept. */
function triggerRequirement(intent: AutomationIntent): DerivedRequirement | null {
  const concept = intent.triggerConcept;
  if (!concept) return null;

  switch (concept) {
    case "form_submission":
      return {
        requirementKey: "trigger.source",
        prompt: "Which form should trigger this workflow? Share the form name or URL.",
        valueType: "identifier",
        blocking: true,
      };
    case "sheet_change":
      return {
        requirementKey: "trigger.source",
        prompt: "Which sheet should trigger this workflow? Share the sheet name or URL.",
        valueType: "identifier",
        blocking: true,
      };
    case "webhook":
      return {
        requirementKey: "trigger.source",
        prompt: "What endpoint or app will send the webhook that triggers this?",
        valueType: "text",
        blocking: true,
      };
    case "schedule":
      return {
        requirementKey: "trigger.schedule",
        prompt: "What schedule should run this? e.g. \"every weekday at 9am\".",
        valueType: "text",
        blocking: true,
      };
    // payment / generic triggers resolve via integration presence — no extra Q.
    default:
      return null;
  }
}

/**
 * Derive all blocking requirements for an intent. Deterministic +
 * catalog-driven. Order: trigger source first, then integration config
 * (stable by integration order, then catalog param order), then generic
 * integration disambiguation.
 */
export function deriveRequirements(intent: AutomationIntent): DerivedRequirement[] {
  const out: DerivedRequirement[] = [];
  const seen = new Set<string>();

  const push = (req: DerivedRequirement | null) => {
    if (!req || seen.has(req.requirementKey)) return;
    seen.add(req.requirementKey);
    out.push(req);
  };

  // 1. Trigger source.
  push(triggerRequirement(intent));

  // 2. Per-integration user-config params, read from the catalog.
  for (const integration of intent.integrations) {
    // Generic integration → disambiguate instead of asking for its params.
    const generic = GENERIC_INTEGRATIONS[integration];
    if (generic) {
      push({
        requirementKey: `integration.${generic.role}`,
        prompt: generic.prompt,
        valueType: "integration",
        blocking: true,
        options: generic.options,
      });
      continue;
    }

    const ops = operationsForIntegration(integration);
    const paramsForIntegration = new Set<string>();
    for (const op of ops) {
      for (const p of op.requiredParams) {
        if (USER_CONFIG_PARAMS.has(p)) paramsForIntegration.add(p);
      }
    }
    for (const param of paramsForIntegration) {
      push(configRequirement(integration, param));
    }
  }

  return out;
}

function labelFor(integration: SupportedIntegration): string {
  const map: Partial<Record<SupportedIntegration, string>> = {
    slack: "Slack",
    whatsapp: "WhatsApp",
    email: "email",
    hubspot: "HubSpot",
    salesforce: "Salesforce",
    sheets: "Google Sheets",
    google: "Google",
  };
  return map[integration] ?? integration;
}
