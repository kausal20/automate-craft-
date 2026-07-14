/**
 * Default-wired orchestrator.
 *
 * Wires the engines that exist today (intent + clarification) plus the real
 * session repo into one ready-to-use orchestrator. Stages whose engines are
 * not yet implemented (planner/generator/validator/testing/monitoring) remain
 * unwired and throw EngineNotWiredError if called — loud, not silent.
 *
 * The live chat route consumes THIS instance, making the catalog-driven
 * Clarification Engine the single production clarification system.
 */

import { AutomationAgentOrchestrator } from "./orchestrator";
import { intentEngine } from "./intent";
import { clarificationEngine } from "./clarification";
import { workflowPlanner } from "./planning";
import { workflowGenerator } from "./generation";
import { workflowValidator } from "./validation";
import { workflowTestingAgent } from "./testing";
import { deploymentAgent } from "./deployment";
import { agentSessionRepo } from "./repo";

export const defaultAgentOrchestrator = new AutomationAgentOrchestrator({
  repo: agentSessionRepo,
  intent: intentEngine,
  clarification: clarificationEngine,
  planner: workflowPlanner,
  generator: workflowGenerator,
  validator: workflowValidator,
  testing: workflowTestingAgent,
  deployment: deploymentAgent,
});
