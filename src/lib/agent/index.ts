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
  DeploymentAgent,
  ConnectionProvider,
  OptimizationAgent,
  AgentSessionRepo,
} from "./interfaces";

export {
  AutomationAgentOrchestrator,
  EngineNotWiredError,
  SessionNotFoundError,
  type AgentEngines,
} from "./orchestrator";

/* ── Canvas projection (a VIEW of the IR, never a second source) ── */
export {
  projectIRToCanvas,
  type CanvasWorkflow,
  type CanvasNode,
  type CanvasEdge,
  type CanvasNodeType,
} from "./projection";

/* ── Pipeline event contract (what the UI renders) ──────────────── */
export {
  PIPELINE_STAGES,
  STAGE_LABEL,
  summarizeRun,
  type PipelineStage,
  type PipelineEvent,
  type PipelineErrorCode,
  type PipelineQuestion,
  type PipelineEmit,
} from "./pipeline";

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

/* ── Phase E: Workflow Validator ────────────────────────────────── */
export { workflowValidator } from "./validation";
export type { ValidatorContext } from "./validation";

/* ── Phase F: Workflow Testing Agent ────────────────────────────── */
export { workflowTestingAgent } from "./testing";
export {
  offlineApiProbe,
  offlineCredentialProbe,
  type ApiProbe,
  type ApiProbeResult,
  type CredentialProbe,
  type CredentialProbeResult,
  type TestingContext,
} from "./testing";

/* ── Phase G: Deployment Agent ──────────────────────────────────── */
export {
  deploymentAgent,
  compileIrToN8n,
  CompilationError,
  resolveCredentials,
  requiredIntegrations,
  liveN8nDeploymentClient,
  type N8nDeploymentClient,
  type DeployedWorkflowRef,
  type CompileResult,
  type CredentialResolution,
  type CredentialResolver,
  type LifecycleInput,
  type PreviousDeployment,
} from "./deployment";

/* ── Phase H: Monitoring Agent ──────────────────────────────────── */
export { monitoringAgent, THRESHOLDS as MONITORING_THRESHOLDS } from "./monitoring";
export type { MonitoringContext } from "./monitoring";

/* ── Phase I: Optimization Agent ────────────────────────────────── */
export { optimizationAgent, OPT_THRESHOLDS } from "./optimization";
export type { OptimizationContext } from "./optimization";

/* ── Session persistence ────────────────────────────────────────── */
export { agentSessionRepo } from "./repo";

/* ── Default-wired orchestrator ─────────────────────────────────── */
export { defaultAgentOrchestrator } from "./default";
