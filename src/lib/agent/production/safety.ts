/**
 * Test-run safety. A test run sends for real, so:
 *
 *  - Every outbound step (WhatsApp, email, Slack, outgoing web request) gets a
 *    test-only recipient question: "which of YOUR OWN numbers should get the
 *    test?". The test copy sends ONLY to those answers — even a fixed number in
 *    the plan could belong to someone else, so it is replaced too. Strangers
 *    never receive a test message.
 *  - Steps that move money cannot be test-run safely, so plans containing them
 *    are not built.
 *
 * Pure functions; the real workflow keeps its real recipients.
 */

import type { BrainPlan } from "../brain/plan-schema";
import { normalizeLang } from "./errors";

/** (integration, operation) -> recipient param. */
const OUTBOUND: Record<string, string> = {
  "whatsapp:send_message": "to",
  "whatsapp:send_template": "to",
  "email:send_email": "to",
  "email:send_html_email": "to",
  "slack:post_message": "channel",
  "slack:post_thread": "channel",
  "webhook:send_request": "url",
};

/** Steps that take or move real money. Never test-run, never built for now. */
const MONEY: Set<string> = new Set(["stripe:create_charge", "razorpay:capture_payment"]);

export interface TestRecipientField {
  key: string;
  integration: string;
  param: string;
  question: string;
}

const Q: Record<string, Record<"en" | "hi" | "hinglish", string>> = {
  "whatsapp:to": {
    en: "For the test run, which of YOUR OWN WhatsApp numbers should get the test message?",
    hinglish: "Test ke liye, aapka APNA kaunsa WhatsApp number test message lega?",
    hi: "टेस्ट के लिए, आपका अपना कौन सा WhatsApp नंबर टेस्ट संदेश पाएगा?",
  },
  "email:to": {
    en: "For the test run, which of YOUR OWN email addresses should get the test email?",
    hinglish: "Test ke liye, aapka APNA kaunsa email test email lega?",
    hi: "टेस्ट के लिए, आपका अपना कौन सा ईमेल टेस्ट ईमेल पाएगा?",
  },
  "slack:channel": {
    en: "For the test run, which of YOUR OWN Slack channels should get the test message?",
    hinglish: "Test ke liye, aapka APNA kaunsa Slack channel test message lega?",
    hi: "टेस्ट के लिए, आपका अपना कौन सा Slack चैनल टेस्ट संदेश पाएगा?",
  },
  "webhook:url": {
    en: "For the test run, which of YOUR OWN web addresses should receive the test request?",
    hinglish: "Test ke liye, aapka APNA kaunsa web address test request lega?",
    hi: "टेस्ट के लिए, आपका अपना कौन सा वेब पता टेस्ट अनुरोध पाएगा?",
  },
};

export function moneySteps(plan: BrainPlan): string[] {
  return plan.steps.filter((s) => MONEY.has(`${s.integration}:${s.operation}`)).map((s) => s.id);
}

/** One owner-only test recipient question per outbound (app, recipient param). */
export function testRecipientFields(plan: BrainPlan): TestRecipientField[] {
  const lang = normalizeLang(plan.language);
  const out = new Map<string, TestRecipientField>();
  for (const step of plan.steps) {
    const param = OUTBOUND[`${step.integration}:${step.operation}`];
    if (!param) continue;
    const key = `test.${step.integration}.${param}`;
    if (!out.has(key)) {
      out.set(key, { key, integration: step.integration!, param, question: Q[`${step.integration}:${param}`][lang] });
    }
  }
  return [...out.values()];
}

function validFor(field: TestRecipientField, value: string): boolean {
  if (field.integration === "whatsapp") return /^\+?[0-9][0-9\s-]{7,16}$/.test(value);
  if (field.integration === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (field.integration === "webhook") return /^https:\/\/[^\s]+$/.test(value);
  return value.length > 0 && value.length <= 200;
}

/** Which test-recipient questions still lack a valid answer. */
export function unansweredTestRecipients(plan: BrainPlan, answers: Record<string, string>): TestRecipientField[] {
  return testRecipientFields(plan).filter((f) => {
    const v = (answers[f.key] ?? "").trim();
    return !v || !validFor(f, v);
  });
}

/**
 * The plan used ONLY for the test copy: every outbound recipient is replaced
 * with the owner's own test answer. Throws if an answer is missing — callers
 * check `unansweredTestRecipients` first, so this is a safety net.
 */
export function applyTestRecipients(plan: BrainPlan, answers: Record<string, string>): BrainPlan {
  const copy: BrainPlan = structuredClone(plan);
  const fields = new Map(testRecipientFields(plan).map((f) => [f.key, f]));
  for (const step of copy.steps) {
    const param = OUTBOUND[`${step.integration}:${step.operation}`];
    if (!param) continue;
    const field = fields.get(`test.${step.integration}.${param}`);
    const value = field ? (answers[field.key] ?? "").trim() : "";
    if (!field || !validFor(field, value)) {
      throw new Error(`No owner test recipient for ${step.integration}.${param}`);
    }
    step.params[param] = { source: "literal", value };
  }
  return copy;
}
