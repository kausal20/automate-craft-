/**
 * Deterministic IntentEngine.
 *
 * Produces a structured AutomationIntent from raw user text without an LLM
 * call — fast, free, testable, and the single intent source for the live
 * pipeline. It detects:
 *   - whether the text is an automation request at all
 *   - a trigger concept (form_submission / sheet_change / webhook / schedule
 *     / payment), used by the clarification requirement-spec
 *   - referenced integrations (closed catalog vocabulary)
 *   - ordered action concepts (notify / update_crm / save / create_task …)
 *   - a one-line business goal for naming
 *
 * Detection is keyword-based but its OUTPUT is the stable AutomationIntent
 * model — downstream engines never see the raw regex. Confidence is lowered
 * when no integration + no trigger is detected so the orchestrator can route
 * weak intents to a generic LLM answer rather than clarification.
 */

import {
  SUPPORTED_INTEGRATIONS,
  type SupportedIntegration,
} from "@/lib/workflow";
import type { IntentEngine } from "../interfaces";
import type { AutomationIntent } from "../models/intent";

const AUTOMATION_RE =
  /\b(automate|automation|workflow|when|whenever|if|trigger|send|notify|create|update|sync|route|add|post|alert|message|submit|submitted)\b/i;

/** Integration keyword → slug (closed vocabulary, catalog-aligned). */
const INTEGRATION_KEYWORDS: Array<[RegExp, SupportedIntegration]> = [
  [/\b(whatsapp|wa message|wa notification)\b/i, "whatsapp"],
  [/\b(slack)\b/i, "slack"],
  [/\b(email|gmail|inbox|mail)\b/i, "email"],
  [/\b(google sheets?|spreadsheet|sheet)\b/i, "sheets"],
  [/\b(google forms?|typeform|jotform|\bform\b)\b/i, "forms"],
  [/\b(hubspot)\b/i, "hubspot"],
  [/\b(salesforce)\b/i, "salesforce"],
  [/\b(stripe)\b/i, "stripe"],
  [/\b(razorpay)\b/i, "razorpay"],
  [/\b(webhook|endpoint)\b/i, "webhook"],
  [/\b(crm|pipedrive|zoho)\b/i, "crm"],
];

function detectTriggerConcept(text: string): string | null {
  const n = text.toLowerCase();
  if (/\b(form|typeform|jotform|submission|submitted|signup form)\b/.test(n)) return "form_submission";
  if (/\b(sheet|spreadsheet|new row|row added|airtable)\b/.test(n)) return "sheet_change";
  if (/\b(webhook|endpoint|api call)\b/.test(n)) return "webhook";
  if (/\b(every day|daily|weekly|hourly|schedule|cron|each morning|at \d)\b/.test(n)) return "schedule";
  if (/\b(payment|charge|paid|invoice|stripe|razorpay)\b/.test(n)) return "payment";
  return null;
}

function detectActionConcepts(text: string): string[] {
  const n = text.toLowerCase();
  const out: string[] = [];
  if (/\b(notify|alert|message|send|post|ping|dm)\b/.test(n)) out.push("notify");
  if (/\b(update|sync|add to).{0,12}(crm|hubspot|salesforce)\b/.test(n)) out.push("update_crm");
  if (/\b(save|store|log|record|append)\b/.test(n)) out.push("save");
  if (/\b(create|make|add).{0,12}(task|ticket|follow.?up|reminder)\b/.test(n)) out.push("create_task");
  if (/\b(score|qualify|rank|grade)\b/.test(n)) out.push("score");
  return out;
}

function detectIntegrations(text: string): SupportedIntegration[] {
  const found: SupportedIntegration[] = [];
  for (const [re, slug] of INTEGRATION_KEYWORDS) {
    if (re.test(text) && !found.includes(slug)) found.push(slug);
  }
  // sanity: keep only real catalog slugs
  return found.filter((s) => (SUPPORTED_INTEGRATIONS as readonly string[]).includes(s));
}

function deriveGoal(text: string): string | null {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
}

class DeterministicIntentEngine implements IntentEngine {
  async detect(input: { sessionId: string; text: string }): Promise<AutomationIntent> {
    const text = input.text ?? "";
    const isAutomationRequest = AUTOMATION_RE.test(text);
    const triggerConcept = detectTriggerConcept(text);
    const actionConcepts = detectActionConcepts(text);
    const integrations = detectIntegrations(text);

    // Confidence: high when we see both a trigger and ≥1 integration/action.
    let confidence = 0.3;
    if (isAutomationRequest) confidence += 0.2;
    if (triggerConcept) confidence += 0.2;
    if (integrations.length > 0) confidence += 0.2;
    if (actionConcepts.length > 0) confidence += 0.1;
    confidence = Math.min(1, confidence);

    return {
      sessionId: input.sessionId,
      sourceText: text,
      isAutomationRequest,
      triggerConcept,
      actionConcepts,
      integrations,
      businessGoal: deriveGoal(text),
      confidence,
      createdAt: Date.now(),
    };
  }
}

export const intentEngine: IntentEngine = new DeterministicIntentEngine();
