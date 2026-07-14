/**
 * AgentSession — the unified persistent record for one automation-building
 * session. Exactly one active `state` at all times.
 *
 * This is the memory backbone: every stage writes its artifact here, and
 * the orchestrator reads prior artifacts to avoid re-asking or re-deriving
 * anything already known. One session maps 1:1 to one chat conversation
 * (`chatId`).
 *
 * Persistence target (Phase A defines shape only):
 *   - Supabase table `agent_sessions` in supabase mode
 *   - local-store JSON in open-access/dev mode
 * Repo wiring lands with the engine phases; the model is stable now.
 */

import type { AgentWorkflowIR } from "./workflow-ir";
import type { AgentState } from "../state-machine";
import type { AutomationIntent } from "./intent";
import type { ClarificationSession } from "./clarification";
import type { WorkflowPlan } from "./plan";
import type { ValidationReport } from "./validation";
import type { TestReport } from "./testing";
import type { MonitoringSummary } from "./monitoring";

/** Integrations the user has actually connected — fed into validation. */
export interface KnownConnection {
  integration: string;
  status: "connected" | "expired" | "revoked" | "pending";
  /** Vault credential name, when a credential is stored. */
  credentialName?: string;
}

/** Persisted business preferences reused across sessions. */
export interface BusinessPreferences {
  defaultCrm?: string;
  defaultNotificationChannel?: string;
  timezone?: string;
  [key: string]: string | undefined;
}

export interface AgentSession {
  /** Equals the chat conversation id. */
  sessionId: string;
  userId: string;
  state: AgentState;

  /* ── stage artifacts (each null until its stage runs) ─────────── */
  intent: AutomationIntent | null;
  clarification: ClarificationSession | null;
  /** Latest plan. Prior plans retained in `planHistory` (never overwritten). */
  plan: WorkflowPlan | null;
  /** Append-only plan history for versioning + rollback. */
  planHistory: WorkflowPlan[];
  /**
   * Canonical Workflow IR document — the single source of truth once
   * generated. `workflowIR.core` is the deployable canonical `WorkflowIR`.
   */
  workflowIR: AgentWorkflowIR | null;
  /** Append-only IR revisions for rollback. Never overwritten. */
  workflowIRHistory: AgentWorkflowIR[];
  /** Monotonic IR revision; bumped on every regeneration (rollback support). */
  workflowVersion: number;
  /** Latest validation report. Prior reports retained in `validationHistory`. */
  validation: ValidationReport | null;
  /** Append-only report history. Never overwritten. */
  validationHistory: ValidationReport[];
  test: TestReport | null;
  monitoring: MonitoringSummary | null;

  /* ── memory ───────────────────────────────────────────────────── */
  knownConnections: KnownConnection[];
  preferences: BusinessPreferences;
  /** Automation ids previously built by this user (cross-session recall). */
  priorWorkflowIds: string[];
  /** Deployment ids this session produced (deployment history). */
  deploymentIds: string[];

  /* ── failure context ─────────────────────────────────────────── */
  /** Populated when state === "FAILED". Cleared on reset to IDLE. */
  failure: { stage: string; reason: string; at: number } | null;

  createdAt: number;
  updatedAt: number;
}

/** Fresh session in IDLE with all artifacts empty. */
export function emptyAgentSession(sessionId: string, userId: string): AgentSession {
  const now = Date.now();
  return {
    sessionId,
    userId,
    state: "IDLE",
    intent: null,
    clarification: null,
    plan: null,
    planHistory: [],
    workflowIR: null,
    workflowIRHistory: [],
    validationHistory: [],
    workflowVersion: 0,
    validation: null,
    test: null,
    monitoring: null,
    knownConnections: [],
    preferences: {},
    priorWorkflowIds: [],
    deploymentIds: [],
    failure: null,
    createdAt: now,
    updatedAt: now,
  };
}
