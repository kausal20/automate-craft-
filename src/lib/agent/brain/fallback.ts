/**
 * Deterministic fallback brain.
 *
 * Wraps the EXISTING deterministic builder (ai/fallback) so the planner keeps
 * answering when the model is down or returns garbage. It converts that
 * builder's IR into the plan schema; it adds no new planning logic.
 */

import { buildDeterministicIR } from "@/lib/ai/fallback";
import { BrainUnavailableError, type PlannerBrain, type PlannerInput } from "./interface";
import { brainPlanSchema, type BrainPlan } from "./plan-schema";

export class DeterministicBrain implements PlannerBrain {
  readonly name = "fallback";

  isReady(): boolean {
    return true;
  }

  async suggest(input: PlannerInput): Promise<{ plan: BrainPlan; model: string }> {
    const ir = buildDeterministicIR(input.prompt);

    const candidate = {
      name: ir.name,
      summary: ir.description ?? ir.name,
      language: "en",
      trigger: {
        kind: ir.trigger.kind,
        integration: (ir.trigger as { integration?: string }).integration ?? null,
        config: Object.fromEntries(
          Object.entries((ir.trigger as { config?: Record<string, unknown> }).config ?? {})
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        ),
      },
      steps: ir.steps.map((s) => ({
        id: s.id,
        label: s.name,
        kind: s.kind,
        integration: s.integration ?? null,
        operation: s.operation,
        params: s.params,
        next: s.next,
        errorPolicy: s.onError,
      })),
      appsRequired: [],
      missingFields: ir.setupFields.map((f) => ({
        key: f.key,
        stepId: null,
        param: null,
        question: `${f.label}? ${f.helpText}`.slice(0, 300),
      })),
      unsupportedRequests: [],
    };

    const parsed = brainPlanSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new BrainUnavailableError("Fallback plan did not match the plan schema.", "bad_output");
    }
    return { plan: parsed.data, model: "deterministic" };
  }
}
