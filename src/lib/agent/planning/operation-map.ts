/**
 * Concept → catalog-operation resolution.
 *
 * Maps an action concept (from AutomationIntent) for a given integration to a
 * concrete catalog operation. Every mapping is verified against the operation
 * catalog via `lookupOperation` at module init — if a mapping ever points at
 * a non-existent (integration, operation) pair, it is dropped, so the planner
 * can NEVER emit an operation the catalog doesn't define (no hallucination).
 *
 * The planner consumes only the validated map.
 */

import {
  lookupOperation,
  type SupportedIntegration,
  type StepKind,
} from "@/lib/workflow";

export interface ResolvedOperation {
  integration: SupportedIntegration;
  operation: string;
  kind: StepKind;
  requiredParams: readonly string[];
}

/**
 * Raw concept → (integration → operation) table. Validated below.
 * Only operations that exist in the catalog survive.
 */
const RAW: Record<string, Partial<Record<SupportedIntegration, string>>> = {
  notify: {
    slack: "post_message",
    whatsapp: "send_message",
    email: "send_email",
  },
  save: {
    sheets: "append_row",
    google: "drive_upload",
  },
  update_crm: {
    hubspot: "create_contact",
    salesforce: "create_lead",
    crm: "create_contact",
  },
};

/** Step kind per operation, derived from the catalog entry. */
function kindFor(integration: SupportedIntegration, operation: string): StepKind | null {
  const def = lookupOperation(integration, operation);
  if (!def) return null;
  return def.kinds[0] ?? "action";
}

/** Build the validated map once. */
const VALIDATED: Record<string, Partial<Record<SupportedIntegration, ResolvedOperation>>> = {};
for (const [concept, byIntegration] of Object.entries(RAW)) {
  VALIDATED[concept] = {};
  for (const [integration, operation] of Object.entries(byIntegration)) {
    const slug = integration as SupportedIntegration;
    const def = lookupOperation(slug, operation);
    if (!def) continue; // drop anything the catalog doesn't define
    const kind = kindFor(slug, operation) ?? "action";
    VALIDATED[concept][slug] = {
      integration: slug,
      operation,
      kind,
      requiredParams: def.requiredParams,
    };
  }
}

/** Concepts the planner knows how to action. */
export const ACTIONABLE_CONCEPTS = new Set(Object.keys(RAW));

/**
 * Resolve an operation for (concept, integration). Returns null when the
 * concept isn't actionable, the integration has no mapping, or the catalog
 * lookup failed.
 */
export function resolveOperation(
  concept: string,
  integration: SupportedIntegration,
): ResolvedOperation | null {
  return VALIDATED[concept]?.[integration] ?? null;
}

/** All integrations that can action a given concept (catalog order). */
export function integrationsForConcept(concept: string): SupportedIntegration[] {
  return Object.keys(VALIDATED[concept] ?? {}) as SupportedIntegration[];
}

/* ── Param classification ─────────────────────────────────────────── */

/**
 * Params a human supplies as configuration (resolved from clarification) vs
 * params filled from the trigger payload / upstream data. Used to decide a
 * param's PlannedParamSource + to detect genuinely missing config.
 */
export const USER_CONFIG_PARAMS = new Set([
  "channel",
  "to",
  "sheet",
  "folder_id",
]);

/** Params typically carried from the trigger payload. */
export const DATA_FLOW_PARAMS = new Set([
  "text",
  "body",
  "html",
  "subject",
  "values",
  "email",
  "name",
  "amount",
  "currency",
  "source",
  "message",
  "content",
  "filename",
  "input",
  "id",
  "company",
]);

/** Map a (integration, param) to the clarification requirementKey that fills it. */
export function requirementKeyForParam(
  integration: SupportedIntegration,
  param: string,
): string {
  return `${integration}.${param}`;
}
