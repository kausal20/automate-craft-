/**
 * Agent models barrel.
 */

export type { AutomationIntent } from "./intent";

export type {
  ClarificationValueType,
  ClarificationQuestionStatus,
  ClarificationQuestion,
  ClarificationAnswer,
  ResolvedRequirements,
  ClarificationSession,
} from "./clarification";
export {
  emptyClarificationSession,
  isClarificationComplete,
  pendingBlockingQuestions,
} from "./clarification";

export type {
  PlannedParamSource,
  PlannedErrorPolicy,
  PlannedTrigger,
  PlannedStep,
  WorkflowPlan,
  PlanIssueSeverity,
  PlanIssueCode,
  PlanningIssue,
  PlanWarningSeverity,
  PlanWarningCode,
  PlanningWarning,
  RequiredCredential,
  DataFlowEdge,
  PlanRetryPolicy,
  PlanTimeoutStrategy,
} from "./plan";

export type {
  ValidationSeverity,
  ValidationCategory,
  ValidationIssueCode,
  ValidationIssue,
  DeploymentStatus,
  CategoryResult,
  ValidationReport,
} from "./validation";
export { buildValidationReport } from "./validation";

export type {
  TestStatus,
  TestModule,
  TestIssueSeverity,
  TestIssueCode,
  TestIssue,
  NodeTestResult,
  ModuleResult,
  TimelineEntry,
  DeploymentRecommendation,
  TestReport,
} from "./testing";
export { buildTestReport } from "./testing";

export type {
  HealthStatus,
  ExecutionReport,
  MonitoringSummary,
} from "./monitoring";
export { deriveHealth, successRate } from "./monitoring";

export type {
  KnownConnection,
  BusinessPreferences,
  AgentSession,
} from "./session";
export { emptyAgentSession } from "./session";

export type {
  AgentWorkflowIR,
  IRVariableType,
  IRVariable,
  IRMapping,
  IRRetryPolicy,
  IRTimeoutPolicy,
  IRErrorPolicy,
  IRNode,
  IREdge,
  IRFieldSchema,
  IOSchema,
  IRParamSchema,
  IRNodeSchema,
  IRConnectionSchema,
  IRMetadata,
} from "./workflow-ir";
export { AGENT_IR_SCHEMA_VERSION, GENERATOR_VERSION } from "./workflow-ir";
