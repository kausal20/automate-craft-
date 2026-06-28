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

import type { WorkflowIR } from "@/lib/workflow";
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
  /** Build a logical plan from intent + resolved requirements. */
  plan(input: {
    intent: AutomationIntent;
    clarification: ClarificationSession;
  }): WorkflowPlan;
}

/* ── Generation (Plan → Canonical IR) ─────────────────────────────── */

export interface WorkflowGenerator {
  /**
   * Deterministically lower a plan into Canonical Workflow IR. No AI.
   * Assigns ids, builds the DAG, attaches metadata, sets schemaVersion.
   */
  generate(input: { plan: WorkflowPlan; version: number }): WorkflowIR;
}

/* ── Validation ───────────────────────────────────────────────────── */

export interface ValidatorAgent {
  /**
   * Run IR validators PLUS agent-level checks (credentials, connection
   * status, duplicate actions). Pure: connection facts are passed in,
   * not fetched, so the validator stays deterministic + testable.
   */
  validate(input: {
    sessionId: string;
    workflow: WorkflowIR;
    knownConnections: KnownConnection[];
  }): ValidationReport;
}

/* ── Testing ──────────────────────────────────────────────────────── */

export interface TestingAgent {
  /** Deterministic dry-run simulation over the IR. No real integration calls. */
  test(input: { sessionId: string; workflow: WorkflowIR }): TestReport;
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
