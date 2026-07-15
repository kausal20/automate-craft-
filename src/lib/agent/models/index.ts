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
  /** Pre-deploy READINESS verdict (READY / BLOCKED) — not the deploy outcome. */
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
  DeploymentOutcome,
  ActivationStatus,
  DeploymentOperation,
  DeploymentErrorCode,
  DeploymentIssue,
  RollbackReport,
  DeploymentReport,
} from "./deployment";
export { buildDeploymentReport, COMPILER_VERSION } from "./deployment";

export type {
  ExecutionStatus,
  ExecutionRecord,
  NodeExecutionStatus,
  NodeExecutionRecord,
  RuntimeEventLevel,
  RuntimeEventRecord,
  CredentialObservation,
  MonitoringHealth,
  AlertSeverity,
  AlertCode,
  Alert,
  MonitoringModule,
  ExecutionSummary,
  NodeStats,
  PerformanceStats,
  RetryStats,
  FailurePattern,
  Analytics,
  MonitoringRecommendation,
  ModuleOutcome,
  MonitoringReport,
} from "./monitoring";
export { deriveHealth, deriveHealthScore, orderModules } from "./monitoring";

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

export type {
  OptimizationCategory,
  OptimizationPriority,
  OptimizationSeverity,
  OptimizationConfidence,
  ImplementationDifficulty,
  RiskLevel,
  OptimizationCode,
  EstimatedImpact,
  OptimizationRecommendation,
  OptimizationScores,
  OptimizationReport,
} from "./optimization";
export {
  confidenceFromSample,
  recommendationId,
  rankRecommendations,
  aggregateImprovements,
} from "./optimization";
