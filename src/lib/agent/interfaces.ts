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
import type { AutomationIntent } from "./models/intent";
import type {
  ClarificationSession,
  ClarificationQuestion,
} from "./models/clarification";
import type { WorkflowPlan } from "./models/plan";
import type { ValidationReport } from "./models/validation";
import type { TestReport } from "./models/testing";
import type { ExecutionReport, MonitoringSummary } from "./models/monitoring";
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

/* ── Monitoring ───────────────────────────────────────────────────── */

export interface MonitoringAgent {
  /** Aggregate stored run rows into a health summary. */
  summarize(input: {
    automationId: string;
    report: ExecutionReport;
  }): MonitoringSummary;
}

/* ── Session persistence ──────────────────────────────────────────── */

export interface AgentSessionRepo {
  get(sessionId: string): Promise<AgentSession | null>;
  save(session: AgentSession): Promise<AgentSession>;
  /** Patch + bump updatedAt. */
  patch(sessionId: string, patch: Partial<AgentSession>): Promise<AgentSession>;
}
