/**
 * Engine interfaces — the contracts each pipeline stage implements.
 *
 * Phase A defines these so the orchestrator can be written against stable
 * boundaries while individual engines (Phases B–G) are filled in. Each
 * engine is a pure-ish function object: takes prior artifacts, returns the
 * next artifact. Side effects (DB writes, credit deduction, adapter calls)
 * are the orchestrator's job, NOT the engines'.
 *
 * This separation is what makes every decision explainable + testable:
 * an engine's output is a deterministic function of its inputs.
 */

import type { PlanTier } from "@/lib/workflow";
import type { AgentWorkflowIR } from "./models/workflow-ir";
import type { ApiProbe, CredentialProbe } from "./testing/probes";
import type { DeploymentReport } from "./models/deployment";
import type { N8nDeploymentClient } from "./deployment/client";
import type { CredentialResolver } from "./deployment/credentials";
import type { LifecycleInput, PreviousDeployment } from "./deployment/agent";
import type { AutomationIntent } from "./models/intent";
import type {
  ClarificationSession,
  ClarificationQuestion,
} from "./models/clarification";
import type { WorkflowPlan } from "./models/plan";
import type { ValidationReport } from "./models/validation";
import type { TestReport } from "./models/testing";
import type {
  CredentialObservation,
  ExecutionRecord,
  MonitoringReport,
  NodeExecutionRecord,
  RuntimeEventRecord,
} from "./models/monitoring";
import type { AgentSession, KnownConnection } from "./models/session";

/* ── Intent detection ─────────────────────────────────────────────── */

export interface IntentEngine {
  detect(input: { sessionId: string; text: string }): Promise<AutomationIntent>;
}

/* ── Clarification ────────────────────────────────────────────────── */

export interface ClarificationEngine {
  /**
   * Given intent + current clarification state + all user text so far,
   * return the updated session: new questions appended (deduped by
   * requirementKey), answers folded in, resolved facts recomputed,
   * answered/skipped questions removed from the pending set.
   */
  advance(input: {
    intent: AutomationIntent;
    session: ClarificationSession;
    /** Latest user message — parsed for answers to pending questions. */
    latestUserText: string;
  }): ClarificationSession;

  /** Blocking questions still pending (empty ⇒ ready to plan). */
  outstanding(session: ClarificationSession): ClarificationQuestion[];
}

/* ── Planning ─────────────────────────────────────────────────────── */

export interface WorkflowPlanner {
  /**
   * Build a logical plan from intent + resolved requirements. `knownConnections`
   * lets the planner flag required-but-unconnected integrations (advisory; the
   * Validator is authoritative). `version` stamps the plan for session
   * versioning. Deterministic: identical inputs → identical output.
   */
  plan(input: {
    intent: AutomationIntent;
    clarification: ClarificationSession;
    knownConnections?: KnownConnection[];
    version?: number;
  }): WorkflowPlan;
}

/* ── Generation (Plan → Canonical IR) ─────────────────────────────── */

export interface WorkflowGenerator {
  /**
   * Deterministically lower a plan into the canonical Workflow IR document.
   * No AI, no validation, no deployment. Assigns stable ids, builds the graph,
   * derives variables/mappings/schemas, and attaches metadata.
   * `version` becomes the IR revision. Identical plan ⇒ identical IR.
   */
  generate(input: { plan: WorkflowPlan; version: number }): AgentWorkflowIR;
}

/* ── Validation ───────────────────────────────────────────────────── */

export interface ValidatorAgent {
  /**
   * Inspect the Workflow IR document and produce a ValidationReport. Never
   * modifies the IR. Connection facts are passed in (not fetched) so the
   * validator stays deterministic + unit testable; `createdAt` is injectable
   * for the same reason.
   */
  validate(input: {
    sessionId: string;
    ir: AgentWorkflowIR;
    knownConnections: KnownConnection[];
    plan?: PlanTier;
    createdAt?: number;
  }): ValidationReport;
}

/* ── Testing ──────────────────────────────────────────────────────── */

export interface TestingAgent {
  /**
   * Simulate a validated Workflow IR before deployment. Never deploys, never
   * mutates the IR, never performs a destructive call.
   *
   * Live credential/API checks happen only through the injected probes (which
   * are contractually read-only). With no probe, those modules report SKIPPED
   * rather than claiming a result they never obtained — which also keeps the
   * report deterministic by default. `createdAt` is injectable for the same
   * reason.
   */
  test(input: {
    sessionId: string;
    userId: string;
    ir: AgentWorkflowIR;
    validation: ValidationReport | null;
    knownConnections: KnownConnection[];
    apiProbe?: ApiProbe;
    credentialProbe?: CredentialProbe;
    createdAt?: number;
  }): Promise<TestReport>;
}

/* ── Deployment ───────────────────────────────────────────────────── */

export interface DeploymentAgent {
  /**
   * Compile → upload → verify → activate. Never modifies the IR. Returns a
   * structured DeploymentReport on every path (success or failure) rather than
   * throwing. Rolls back a partial deployment automatically.
   *
   * The n8n client is injected so the full lifecycle is exercisable without a
   * live instance; production uses the live client by default.
   */
  deploy(input: {
    sessionId: string;
    userId: string;
    ir: AgentWorkflowIR;
    validation: ValidationReport | null;
    test: TestReport | null;
    previous?: PreviousDeployment | null;
    client?: N8nDeploymentClient;
    credentialResolver?: CredentialResolver;
    now?: () => number;
    deploymentId?: string;
  }): Promise<DeploymentReport>;

  pause(input: LifecycleInput): Promise<DeploymentReport>;
  resume(input: LifecycleInput): Promise<DeploymentReport>;
  deactivate(input: LifecycleInput): Promise<DeploymentReport>;
  remove(input: LifecycleInput): Promise<DeploymentReport>;
}

/* ── Monitoring ───────────────────────────────────────────────────── */

export interface MonitoringAgent {
  /**
   * Observe a deployed workflow and produce a MonitoringReport. Never modifies
   * the IR, never deploys, never optimizes.
   *
   * Execution history is PASSED IN (not fetched) and `now` is injected, so the
   * report is a pure function of its inputs: identical history ⇒ identical
   * report. Health is derived only from observed records — zero executions
   * yields UNKNOWN, never HEALTHY.
   */
  observe(input: {
    sessionId: string;
    ir: AgentWorkflowIR | null;
    deployment: DeploymentReport | null;
    executions: ExecutionRecord[];
    nodeExecutions: NodeExecutionRecord[];
    runtimeEvents: RuntimeEventRecord[];
    credentials: CredentialObservation[];
    now: number;
    createdAt?: number;
  }): MonitoringReport;
}

/* ── Session persistence ──────────────────────────────────────────── */

export interface AgentSessionRepo {
  get(sessionId: string): Promise<AgentSession | null>;
  save(session: AgentSession): Promise<AgentSession>;
  /** Patch + bump updatedAt. */
  patch(sessionId: string, patch: Partial<AgentSession>): Promise<AgentSession>;
}
