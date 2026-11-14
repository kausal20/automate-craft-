import { env } from "@/lib/env";
import { DeterministicBrain } from "./fallback";
import { GeminiPlanner, GeminiWording, type GeminiConfig } from "./gemini";
import type { WordingModel } from "./interface";
import { createPlanner, type Planner } from "./planner";

export * from "./catalogue";
export * from "./interface";
export * from "./plan-schema";
export * from "./validate";
export { createPlanner, type Planner } from "./planner";
export { GeminiPlanner, GeminiWording, type GeminiConfig } from "./gemini";
export { DeterministicBrain } from "./fallback";

function geminiConfigFromEnv(): GeminiConfig {
  return {
    apiKey: env.geminiApiKey,
    plannerModel: env.geminiPlannerModel,
    lightModel: env.geminiLightModel,
  };
}

/** The production planner: Gemini first, deterministic fallback second. Server-side only. */
export function getPlanner(): Planner {
  return createPlanner({
    primary: new GeminiPlanner(geminiConfigFromEnv()),
    fallback: new DeterministicBrain(),
  });
}

/** Light model for plain-language wording. Server-side only. */
export function getWordingModel(): WordingModel {
  return new GeminiWording(geminiConfigFromEnv());
}
