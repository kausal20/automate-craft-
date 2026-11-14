/**
 * Planner = brain + catalogue gate + fallback.
 *
 *   brain.suggest()  ->  validatePlanAgainstCatalogue()  ->  ok | rejected
 *
 * Rules:
 *  - If the model answers but the plan breaks the catalogue, the result is
 *    REJECTED with a plain reason. We do not silently swap in the fallback,
 *    because that would build something the user did not ask for.
 *  - If the model is down, slow, blocked or returns unusable output, the
 *    deterministic fallback answers (and goes through the same gate).
 *  - Prompts are never logged.
 */

import { createLogger } from "@/lib/logger";
import type { AppCatalogue } from "./catalogue";
import { BrainUnavailableError, type PlannerBrain, type PlannerResult } from "./interface";
import { plainReason, validatePlanAgainstCatalogue } from "./validate";

const log = createLogger("agent/brain");

const GENERIC_REJECTION =
  "I could not turn that into an automation I am sure will work. Could you describe it again in a little more detail?";

export interface Planner {
  plan(input: { prompt: string; catalogue: AppCatalogue }): Promise<PlannerResult>;
}

/**
 * Well-known apps people name in requests. If the prompt names one that the
 * catalogue cannot build, the plan is rejected up front — neither the model
 * nor the fallback may quietly plan "the parts that exist" and drop it.
 */
const KNOWN_APPS: Array<{ slug: string; label: string; pattern: RegExp }> = [
  { slug: "indiamart", label: "IndiaMART", pattern: /\bindia\s?mart\b/i },
  { slug: "justdial", label: "Justdial", pattern: /\bjust\s?dial\b/i },
  { slug: "tally", label: "Tally", pattern: /\btally\b/i },
  { slug: "zoho", label: "Zoho", pattern: /\bzoho\b/i },
  { slug: "shopify", label: "Shopify", pattern: /\bshopify\b/i },
  { slug: "woocommerce", label: "WooCommerce", pattern: /\bwoo\s?commerce\b/i },
  { slug: "instagram", label: "Instagram", pattern: /\binstagram\b/i },
  { slug: "facebook", label: "Facebook", pattern: /\bfacebook\b/i },
  { slug: "telegram", label: "Telegram", pattern: /\btelegram\b/i },
  { slug: "notion", label: "Notion", pattern: /\bnotion\b/i },
  { slug: "airtable", label: "Airtable", pattern: /\bairtable\b/i },
  { slug: "trello", label: "Trello", pattern: /\btrello\b/i },
  { slug: "mailchimp", label: "Mailchimp", pattern: /\bmailchimp\b/i },
  { slug: "calendly", label: "Calendly", pattern: /\bcalendly\b/i },
];

export function unsupportedAppMentions(prompt: string, catalogue: AppCatalogue): Array<{ slug: string; label: string }> {
  const have = new Set(catalogue.apps.map((a) => a.slug));
  return KNOWN_APPS.filter((k) => !have.has(k.slug) && k.pattern.test(prompt)).map(({ slug, label }) => ({ slug, label }));
}

export function createPlanner(deps: { primary: PlannerBrain; fallback: PlannerBrain }): Planner {
  return {
    async plan({ prompt, catalogue }) {
      let fallbackReason: string | undefined;

      const mentioned = unsupportedAppMentions(prompt, catalogue);
      if (mentioned.length > 0) {
        const problems = mentioned.map((m) => ({ code: "UNKNOWN_APP" as const, target: m.slug, detail: "Named in the request; not in the catalogue." }));
        return { status: "rejected", reason: plainReason(problems, catalogue), problems, source: "catalogue" };
      }

      if (deps.primary.isReady()) {
        try {
          const { plan, model } = await deps.primary.suggest({ prompt, catalogue });
          const check = validatePlanAgainstCatalogue(plan, catalogue);
          if (check.ok) {
            return { status: "ok", plan, appsRequired: check.appsRequired, source: deps.primary.name, model };
          }
          log.info("Plan rejected by catalogue check.", { problems: check.problems.map((p) => p.code) });
          return { status: "rejected", reason: check.reason, problems: check.problems, source: deps.primary.name };
        } catch (error) {
          fallbackReason = error instanceof BrainUnavailableError ? error.reason : "unexpected_error";
          log.warn("Primary planner unavailable. Using fallback.", { reason: fallbackReason });
        }
      } else {
        fallbackReason = "not_configured";
      }

      try {
        const { plan, model } = await deps.fallback.suggest({ prompt, catalogue });
        const check = validatePlanAgainstCatalogue(plan, catalogue);
        if (check.ok) {
          return { status: "ok", plan, appsRequired: check.appsRequired, source: deps.fallback.name, model, fallbackReason };
        }
        return { status: "rejected", reason: check.reason, problems: check.problems, source: deps.fallback.name };
      } catch (error) {
        log.error("Fallback planner failed.", { reason: error instanceof BrainUnavailableError ? error.reason : "unexpected_error" });
        return { status: "rejected", reason: GENERIC_REJECTION, problems: [], source: deps.fallback.name };
      }
    },
  };
}
