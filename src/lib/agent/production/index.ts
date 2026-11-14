/**
 * Production agent — wired instance (server-side only).
 *
 * Planner (Gemini → deterministic fallback, catalogue-gated) + existing
 * generator / validator / n8n compiler + live storage, credits, vault and n8n.
 * Without Supabase (local dev) storage falls back to in-memory repos.
 */

import { isSupabaseMode } from "@/lib/env";
import { buildProductionCatalogue, getPlanner } from "../brain";
import { compileIrToN8n } from "../deployment/compiler";
import { workflowGenerator } from "../generation";
import { workflowValidator } from "../validation";
import { AgentService, type AgentDeps, type BuildPipeline } from "./service";
import {
  SupabaseActivityLog,
  SupabaseAutomationRepo,
  SupabaseDraftRepo,
  liveConnectionDirectory,
  liveCredentialBinder,
  liveCreditLedger,
  liveN8nGateway,
} from "./live";
import { MemoryActivityLog, MemoryAutomationRepo, MemoryDraftRepo } from "./memory";

export * from "./types";
export { AgentService, estimateBuildCost, samplePayload, type AgentDeps, type BuildPipeline } from "./service";
export { applyAnswers, brainPlanToWorkflowPlan } from "./converter";
export { checkConnections } from "./gate";
export { AgentUserError, redact, toUserResponse, userMessage } from "./errors";
export { looksLikeAutomationRequest, previewToChatText } from "./chat";

export const existingBuildPipeline: BuildPipeline = {
  generate: (plan) => workflowGenerator.generate({ plan, version: plan.version }),
  validate: (input) => workflowValidator.validate(input),
  compile: (ir, attachments) => compileIrToN8n(ir, attachments).workflow,
};

let instance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (instance) return instance;
  const persistent = isSupabaseMode();
  const deps: AgentDeps = {
    planner: getPlanner(),
    catalogue: buildProductionCatalogue,
    drafts: persistent ? new SupabaseDraftRepo() : new MemoryDraftRepo(),
    automations: persistent ? new SupabaseAutomationRepo() : new MemoryAutomationRepo(),
    activity: persistent ? new SupabaseActivityLog() : new MemoryActivityLog(),
    credits: liveCreditLedger,
    directory: liveConnectionDirectory,
    binder: liveCredentialBinder,
    n8n: liveN8nGateway,
    pipeline: existingBuildPipeline,
    newId: () => crypto.randomUUID(),
  };
  instance = new AgentService(deps);
  return instance;
}

/** Hook for the connections service: pause automations that depend on a lost connection. */
export async function onConnectionLost(userId: string, integration: string): Promise<number> {
  return getAgentService().onConnectionLost(userId, integration);
}
