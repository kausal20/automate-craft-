/**
 * Pipeline events — the deterministic contract between the orchestrator and
 * any UI watching it.
 *
 * The frontend NEVER infers pipeline state. It renders exactly what these
 * events say. Every event corresponds to work that actually happened: a
 * `stage_completed` is written only after the engine returned and the session
 * was persisted, so a stage can never be reported complete before it is.
 *
 * Emission is fire-and-forget from the orchestrator's point of view — the
 * pipeline's correctness never depends on anyone listening.
 */

import type { AgentState } from "./state-machine";
import type { DeploymentOutcome } from "./models/deployment";
import type { CanvasWorkflow } from "./projection";

/** Ordered stages of the production pipeline. */
export const PIPELINE_STAGES = [
  "intent",
  "clarify",
  "plan",
  "generate",
  "validate",
  "test",
  "deploy-ready",
  "deploy",
  "monitor",
  "optimize",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/**
 * User-facing label per stage, shown while the stage is running.
 *
 * These describe work in progress. The completion wording is derived from the
 * real outcome at emit time, never hardcoded — a stage that finishes with
 * nothing to report must not claim success it did not earn.
 */
export const STAGE_LABEL: Record<PipelineStage, string> = {
  intent: "Understanding your request...",
  clarify: "Checking missing information...",
  plan: "Planning workflow...",
  generate: "Generating workflow...",
  validate: "Validating workflow...",
  test: "Running safety checks...",
  "deploy-ready": "Preparing deployment...",
  deploy: "Deploying workflow...",
  monitor: "Checking runtime health...",
  optimize: "Analyzing for improvements...",
};

/** A clarification question, flattened for the wire. */
export interface PipelineQuestion {
  id: string;
  prompt: string;
  requirementKey: string;
  blocking: boolean;
}

export type PipelineEvent =
  /** A stage is about to invoke its engine. */
  | { type: "stage_started"; stage: PipelineStage; label: string; at: number }
  /** The engine returned AND the session was persisted. */
  | {
      type: "stage_completed";
      stage: PipelineStage;
      state: AgentState;
      /** What actually happened — derived from the artifact, not assumed. */
      detail: string;
      at: number;
    }
  /** Already done on a previous run; not re-executed. Resume is visible. */
  | { type: "stage_skipped"; stage: PipelineStage; reason: string; at: number }
  /** A blocking failure. The pipeline stops here; nothing after it runs. */
  | {
      type: "stage_failed";
      stage: PipelineStage;
      reason: string;
      /** Machine-readable so the UI never parses prose. */
      code: PipelineErrorCode;
      at: number;
    }
  /** Pipeline paused for the user. Resumes at `clarify` on the next message. */
  | { type: "clarification_required"; questions: PipelineQuestion[]; at: number }
  /**
   * A read-only view of the IR the Generator produced, for the canvas. The IR
   * itself stays canonical and server-side; this carries no authority.
   */
  | { type: "workflow_generated"; workflow: CanvasWorkflow; at: number }
  | {
      type: "deployment_finished";
      status: DeploymentOutcome;
      workflowId: string | null;
      activationStatus: string;
      at: number;
    }
  | {
      type: "optimization_finished";
      /** Null when the observed sample was too small to score honestly. */
      score: number | null;
      recommendations: number;
      at: number;
    }
  /** Terminal event for a run — always emitted, success or failure. */
  | { type: "pipeline_finished"; state: AgentState; completed: PipelineStage[]; at: number };

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

export type PipelineEmit = (event: PipelineEvent) => void;

/**
 * Human-readable outcome for a completed run, derived ENTIRELY from the events
 * that were actually emitted.
 *
 * No LLM writes this text, so it cannot report a deployment that did not
 * happen or a health verdict nobody observed. If a stage failed, the failure
 * is the summary — successes before it are not spun into a win.
 */
export function summarizeRun(events: PipelineEvent[]): string {
  const failure = events.find((e) => e.type === "stage_failed");
  if (failure) {
    return `${STAGE_LABEL[failure.stage].replace(/\.\.\.$/, "")} failed: ${failure.reason}`;
  }

  const clarify = events.find((e) => e.type === "clarification_required");
  if (clarify) {
    const lines = clarify.questions.map((q, i) => `${i + 1}. ${q.prompt}`);
    return [
      "I need a few details before I can build this:",
      "",
      ...lines,
      "",
      "Answer these and I'll continue from here.",
    ].join("\n");
  }

  const deployment = events.find((e) => e.type === "deployment_finished");
  const optimization = events.find((e) => e.type === "optimization_finished");
  if (!deployment) return "";

  const parts: string[] = [];
  parts.push(
    deployment.status === "DEPLOYED"
      ? `Deployed your workflow (${deployment.workflowId ?? "no id"}, ${deployment.activationStatus.toLowerCase()}).`
      : `Deployment did not complete: ${deployment.status}.`,
  );

  const monitor = events.find(
    (e): e is Extract<PipelineEvent, { type: "stage_completed" }> =>
      e.type === "stage_completed" && e.stage === "monitor",
  );
  if (monitor) parts.push(monitor.detail);

  if (optimization) {
    parts.push(
      optimization.recommendations > 0
        ? `${optimization.recommendations} optimization recommendation(s) available.`
        : "No optimization recommendations yet — not enough runtime data.",
    );
  }

  return parts.join(" ");
}
