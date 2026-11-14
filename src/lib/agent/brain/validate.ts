/**
 * Catalogue validation — in code, not in the prompt.
 *
 * Takes a parsed plan from ANY brain and checks every claim against the
 * catalogue. The model's own `appsRequired` is ignored and recomputed here.
 */

import { appLabel, findApp, type AppCatalogue, type CatalogueOperation } from "./catalogue";
import type { BrainPlan } from "./plan-schema";

export type PlanProblemCode =
  | "UNKNOWN_APP"
  | "UNKNOWN_OPERATION"
  | "KIND_NOT_ALLOWED"
  | "TRIGGER_NOT_SUPPORTED"
  | "BAD_GRAPH"
  | "MISSING_PARAM"
  | "UNSUPPORTED_REQUEST";

export interface PlanProblem {
  code: PlanProblemCode;
  /** App slug, step id or request text the problem is about. */
  target: string;
  detail: string;
}

export type CatalogueCheck =
  | { ok: true; appsRequired: string[] }
  | { ok: false; problems: PlanProblem[]; reason: string };

function findOperation(
  catalogue: AppCatalogue,
  integration: string | null,
  operation: string,
): CatalogueOperation | undefined {
  const pool = integration === null ? catalogue.builtins : findApp(catalogue, integration)?.operations ?? [];
  return pool.find((o) => o.operation === operation);
}

function hasCycle(plan: BrainPlan): boolean {
  const next = new Map(plan.steps.map((s) => [s.id, s.next]));
  const state = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    const s = state.get(id);
    if (s === 1) return true;
    if (s === 2) return false;
    state.set(id, 1);
    for (const n of next.get(id) ?? []) if (visit(n)) return true;
    state.set(id, 2);
    return false;
  };
  return plan.steps.some((s) => visit(s.id));
}

export function validatePlanAgainstCatalogue(plan: BrainPlan, catalogue: AppCatalogue): CatalogueCheck {
  const problems: PlanProblem[] = [];
  const used = new Set<string>();

  // 1. Things the model itself said it cannot do.
  for (const request of plan.unsupportedRequests) {
    problems.push({ code: "UNSUPPORTED_REQUEST", target: request, detail: "Model reported it cannot do this." });
  }

  // 2. Trigger.
  const { trigger } = plan;
  if (trigger.integration !== null) {
    const app = findApp(catalogue, trigger.integration);
    if (!app) {
      problems.push({ code: "UNKNOWN_APP", target: trigger.integration, detail: "Trigger app is not in the catalogue." });
    } else {
      used.add(app.slug);
      if (!app.triggerKinds.includes(trigger.kind)) {
        problems.push({
          code: "TRIGGER_NOT_SUPPORTED",
          target: app.slug,
          detail: `${app.label} cannot start a workflow with a "${trigger.kind}" trigger.`,
        });
      }
    }
  } else if (trigger.kind === "webhook" || trigger.kind === "form" || trigger.kind === "event") {
    // An unbound webhook is allowed by the IR schema; nothing to check.
  }

  // 3. Steps.
  const ids = new Set<string>();
  for (const step of plan.steps) {
    if (ids.has(step.id)) problems.push({ code: "BAD_GRAPH", target: step.id, detail: "Duplicate step id." });
    ids.add(step.id);

    if (step.integration !== null) {
      const app = findApp(catalogue, step.integration);
      if (!app) {
        problems.push({ code: "UNKNOWN_APP", target: step.integration, detail: `Step "${step.id}" uses an app that is not in the catalogue.` });
        continue;
      }
      used.add(app.slug);
    }

    const op = findOperation(catalogue, step.integration, step.operation);
    if (!op) {
      problems.push({
        code: "UNKNOWN_OPERATION",
        target: step.id,
        detail: `"${step.operation}" is not an action of ${step.integration ?? "the built-in steps"}.`,
      });
      continue;
    }
    if (!op.kinds.includes(step.kind)) {
      problems.push({ code: "KIND_NOT_ALLOWED", target: step.id, detail: `"${step.operation}" cannot be used as a "${step.kind}" step.` });
    }

    // Required params: provided, or honestly declared as a missing field.
    for (const param of op.requiredParams) {
      const provided = param in step.params;
      const declared = plan.missingFields.some((m) => m.stepId === step.id && m.param === param);
      if (!provided && !declared) {
        problems.push({ code: "MISSING_PARAM", target: step.id, detail: `"${param}" is neither filled nor asked about.` });
      }
    }
  }

  // 4. Graph.
  for (const step of plan.steps) {
    for (const n of step.next) {
      if (!ids.has(n)) problems.push({ code: "BAD_GRAPH", target: step.id, detail: `Points to unknown step "${n}".` });
    }
  }
  if (problems.every((p) => p.code !== "BAD_GRAPH") && hasCycle(plan)) {
    problems.push({ code: "BAD_GRAPH", target: "graph", detail: "Steps loop back on themselves." });
  }

  // 5. Missing fields must point at real steps.
  for (const m of plan.missingFields) {
    if (m.stepId !== null && !ids.has(m.stepId)) {
      problems.push({ code: "BAD_GRAPH", target: m.key, detail: `Question points to unknown step "${m.stepId}".` });
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems, reason: plainReason(problems, catalogue) };
  }
  return { ok: true, appsRequired: [...used].sort() };
}

/** Everyday-language reason. Never names steps, codes or catalogue internals. */
export function plainReason(problems: PlanProblem[], catalogue: AppCatalogue): string {
  const unknownApps = [...new Set(problems.filter((p) => p.code === "UNKNOWN_APP").map((p) => appLabel(p.target)))];
  const unsupported = problems.filter((p) => p.code === "UNSUPPORTED_REQUEST").map((p) => p.target);
  // "webhook" is a developer concept; owners never see it in a list of what they can use.
  const supported = catalogue.apps
    .filter((a) => a.slug !== "webhook")
    .map((a) => a.label)
    .join(", ");

  if (unknownApps.length > 0) {
    const names = unknownApps.map((n) => `“${n}”`).join(" and ");
    return `I can't connect to ${names} yet. Right now I can work with: ${supported}. Would you like to use one of these instead?`;
  }
  if (unsupported.length > 0) {
    return `I can't do this part yet: ${unsupported.join("; ")}. Tell me if you would like a simpler version I can build.`;
  }
  if (problems.some((p) => p.code === "TRIGGER_NOT_SUPPORTED")) {
    return "I can't start this automation the way you described. Tell me what should kick it off, for example a new form entry or a payment.";
  }
  return "I could not turn that into an automation I am sure will work. Could you describe it again in a little more detail?";
}
