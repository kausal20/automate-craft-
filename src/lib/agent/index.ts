/**
 * Automation Agent — public barrel.
 *
 * Phase A: architecture only — state machine, domain models, engine
 * interfaces. Engine implementations land in Phases B–G and are exported
 * from here as they arrive.
 *
 * Pipeline (enforced by the orchestrator, one stage at a time):
 *   intent → clarify → plan → generate → validate → test
 *          → deploy-ready → deploy → monitor
 *
 * Canonical Workflow IR (`@/lib/workflow`) is the single source of truth
 * for any workflow representation. The agent never produces a second
 * workflow shape.
 */

export {
  AGENT_STATES,
  type AgentState,
  isAgentTransitionAllowed,
  allowedNextStates,
  assertTransition,
  isTerminalState,
  AgentTransitionError,
  STAGE_STATE,
} from "./state-machine";

export * from "./models";

export type {
  IntentEngine,
  ClarificationEngine,
  WorkflowPlanner,
  WorkflowGenerator,
  ValidatorAgent,
  TestingAgent,
  MonitoringAgent,
  AgentSessionRepo,
} from "./interfaces";

export {
  AutomationAgentOrchestrator,
  EngineNotWiredError,
  SessionNotFoundError,
  type AgentEngines,
} from "./orchestrator";

/* ── Intent engine ──────────────────────────────────────────────── */
export { intentEngine } from "./intent";

/* ── Phase B: Clarification Engine ──────────────────────────────── */
export {
  clarificationEngine,
  deriveRequirements,
  type DerivedRequirement,
} from "./clarification";

/* ── Phase C: Workflow Planner ──────────────────────────────────── */
export { workflowPlanner } from "./planning";
export { topoSort, type DagEdge, type TopoResult } from "./planning";

/* ── Phase D: Workflow Generator ────────────────────────────────── */
export { workflowGenerator, GeneratorPreconditionError } from "./generation";

/* ── Session persistence ────────────────────────────────────────── */
export { agentSessionRepo } from "./repo";

/* ── Default-wired orchestrator ─────────────────────────────────── */
export { defaultAgentOrchestrator } from "./default";
