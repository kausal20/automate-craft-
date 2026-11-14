/**
 * The fixed planner interface. Everything else in the agent talks to this,
 * never to a model vendor. Swap Gemini for another model by writing one
 * class that implements `PlannerBrain`.
 */

import type { AppCatalogue } from "./catalogue";
import type { BrainPlan } from "./plan-schema";
import type { PlanProblem } from "./validate";

export interface PlannerInput {
  /** What the user typed, in any language. Treated as data, never as instructions. */
  prompt: string;
  catalogue: AppCatalogue;
}

/** Raw model output could not be obtained or parsed. Triggers the fallback. */
export type BrainUnavailableReason =
  | "not_configured"
  | "timeout"
  | "http_error"
  | "blocked"
  | "bad_output"
  | "network";

export class BrainUnavailableError extends Error {
  readonly reason: BrainUnavailableReason;
  constructor(message: string, reason: BrainUnavailableReason) {
    super(message);
    this.name = "BrainUnavailableError";
    this.reason = reason;
  }
}

/** A brain only suggests. It returns an UNVALIDATED plan or throws BrainUnavailableError. */
export interface PlannerBrain {
  readonly name: string;
  isReady(): boolean;
  suggest(input: PlannerInput): Promise<{ plan: BrainPlan; model: string }>;
}

export type PlannerResult =
  | {
      status: "ok";
      plan: BrainPlan;
      /** Recomputed by code from the validated plan. */
      appsRequired: string[];
      source: string;
      model: string | null;
      /** Set when the primary brain failed and the deterministic fallback answered. */
      fallbackReason?: string;
    }
  | {
      status: "rejected";
      /** Plain language, safe to show the user. */
      reason: string;
      problems: PlanProblem[];
      source: string;
    };

/** Small wording jobs (plain-language messages, summaries). Cheap model. */
export interface WordingModel {
  isReady(): boolean;
  say(input: { instruction: string; text: string; language?: string }): Promise<string>;
}
