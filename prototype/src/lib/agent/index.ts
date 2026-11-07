/**
 * PROTOTYPE COPY of the UI-facing types from src/lib/agent. Types only: the
 * agent pipeline itself is not part of this project. The scripted stand-in
 * lives in src/mock/chat-stream.ts.
 */

export type AgentState =
  | "IDLE"
  | "ANALYZING_INTENT"
  | "COLLECTING_REQUIREMENTS"
  | "PLANNING_WORKFLOW"
  | "GENERATING_WORKFLOW"
  | "VALIDATING_WORKFLOW"
  | "TESTING_WORKFLOW"
  | "READY_FOR_DEPLOYMENT"
  | "DEPLOYING"
  | "MONITORING"
  | "OPTIMIZING"
  | "FAILED";

export type PipelineStage =
  | "intent"
  | "clarify"
  | "plan"
  | "generate"
  | "validate"
  | "test"
  | "deploy-ready"
  | "deploy"
  | "monitor"
  | "optimize";

export type PipelineErrorCode =
  | "INTENT_FAILED"
  | "CLARIFICATION_FAILED"
  | "PLANNING_FAILED"
  | "GENERATION_FAILED"
  | "VALIDATION_FAILED"
  | "TESTING_FAILED"
  | "DEPLOY_BLOCKED"
  | "DEPLOYMENT_FAILED"
  | "MONITORING_UNAVAILABLE"
  | "OPTIMIZATION_FAILED";

export interface CanvasNode {
  id: string;
  type: "trigger" | "process" | "action";
  label: string;
  detail?: string;
  integration: string | null;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

export interface CanvasWorkflow {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  workflowName: string;
  summary: string;
  revision: number;
}

export interface PipelineQuestion {
  id: string;
  prompt: string;
  requirementKey: string;
  blocking: boolean;
}

export type PipelineEvent =
  | { type: "stage_started"; stage: PipelineStage; label: string; at: number }
  | { type: "stage_completed"; stage: PipelineStage; state: AgentState; detail: string; at: number }
  | { type: "stage_skipped"; stage: PipelineStage; reason: string; at: number }
  | { type: "stage_failed"; stage: PipelineStage; reason: string; code: PipelineErrorCode; at: number }
  | { type: "clarification_required"; questions: PipelineQuestion[]; at: number }
  | { type: "workflow_generated"; workflow: CanvasWorkflow; at: number }
  | { type: "pipeline_finished"; state: AgentState; completed: PipelineStage[]; at: number };
