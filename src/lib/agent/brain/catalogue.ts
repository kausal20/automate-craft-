/**
 * App catalogue — the closed list of what the planner may use.
 *
 * Built from the existing workflow catalogue (SUPPORTED_INTEGRATIONS +
 * operation catalog). The model SUGGESTS; `validatePlanAgainstCatalogue`
 * DECIDES. The catalogue is an input to the planner so tests (and later,
 * per-user connection state) can pass their own.
 */

import {
  SUPPORTED_INTEGRATIONS,
  allOperations,
  type StepKind,
  type TriggerKind,
} from "@/lib/workflow";

export interface CatalogueOperation {
  operation: string;
  kinds: readonly StepKind[];
  requiredParams: readonly string[];
  description: string;
}

export interface CatalogueApp {
  slug: string;
  /** Name an owner recognises. Used in every user-facing sentence. */
  label: string;
  /** Trigger kinds this app can start a workflow with. */
  triggerKinds: readonly TriggerKind[];
  operations: readonly CatalogueOperation[];
}

export interface AppCatalogue {
  apps: readonly CatalogueApp[];
  /** Built-in steps (transform / condition / delay / log) available to every plan. */
  builtins: readonly CatalogueOperation[];
}

const LABELS: Record<string, string> = {
  google: "Google Drive",
  whatsapp: "WhatsApp",
  email: "Email",
  slack: "Slack",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  razorpay: "Razorpay",
  stripe: "Stripe",
  webhook: "Webhooks",
  forms: "Forms",
  sheets: "Google Sheets",
  crm: "CRM",
  indiamart: "IndiaMART",
};

export function appLabel(slug: string): string {
  if (LABELS[slug]) return LABELS[slug];
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Mirrors the IR trigger schema: integration-bound triggers exist for webhook/form/event. */
const INTEGRATION_TRIGGER_KINDS: readonly TriggerKind[] = ["webhook", "form", "event"];

let cached: AppCatalogue | null = null;

/** The catalogue of what the platform can actually build today. */
export function buildProductionCatalogue(): AppCatalogue {
  if (cached) return cached;
  const ops = allOperations();
  const toOp = (o: (typeof ops)[number]): CatalogueOperation => ({
    operation: o.operation,
    kinds: o.kinds,
    requiredParams: o.requiredParams,
    description: o.description,
  });
  cached = {
    apps: SUPPORTED_INTEGRATIONS.map((slug) => ({
      slug,
      label: appLabel(slug),
      triggerKinds: INTEGRATION_TRIGGER_KINDS,
      operations: ops.filter((o) => o.integration === slug).map(toOp),
    })),
    builtins: ops.filter((o) => o.integration === null).map(toOp),
  };
  return cached;
}

export function findApp(catalogue: AppCatalogue, slug: string): CatalogueApp | undefined {
  return catalogue.apps.find((a) => a.slug === slug);
}

/** Compact text of the catalogue for the model prompt. */
export function catalogueToPromptText(catalogue: AppCatalogue): string {
  const line = (o: CatalogueOperation) =>
    `    - ${o.operation} [${o.kinds.join("|")}] needs: ${o.requiredParams.join(", ") || "nothing"} — ${o.description}`;
  const apps = catalogue.apps
    .map((a) => {
      const trig = a.triggerKinds.length ? ` (can start a workflow: ${a.triggerKinds.join(", ")})` : "";
      return `  ${a.slug} = ${a.label}${trig}\n${a.operations.map(line).join("\n") || "    (no actions)"}`;
    })
    .join("\n");
  return `APPS:\n${apps}\n\nBUILT-IN STEPS (no app):\n${catalogue.builtins.map(line).join("\n")}`;
}
