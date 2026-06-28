/**
 * AutomationAgentOrchestrator — the single coordinator.
 *
 * This is the ONLY component allowed to sequence the pipeline:
 *
 *   intent → clarify → plan → generate → validate → test
 *          → deploy-ready → deploy → monitor
 *
 * Architectural contract:
 *   - Engines are single-responsibility and NEVER call each other. They
 *     are pure(-ish) transformers of their inputs. The orchestrator is the
 *     only place that knows the order, owns the AgentSession, drives the
 *     state machine, and performs side effects (persistence, credits,
 *     adapter calls — wired in later phases).
 *   - Every stage method: loads session → asserts the legal state
 *     transition → invokes exactly one engine → persists the artifact +
 *     new state → returns the updated session.
 *   - A stage whose engine isn't wired yet throws `EngineNotWiredError`
 *     rather than silently no-op'ing, so partial pipelines fail loudly.
 *
 * Phases fill engines in. Phase B wires `clarification` (+ a minimal
 * intent path). The orchestrator shape is stable from here.
 */

import type { WorkflowIR } from "@/lib/workflow";
import {
  assertTransition,
  type AgentState,
} from "./state-machine";
import type {
  IntentEngine,
  ClarificationEngine,
  WorkflowPlanner,
  WorkflowGenerator,
  ValidatorAgent,
  TestingAgent,
  MonitoringAgent,
  AgentSessionRepo,
} from "./interfaces";
import {
  emptyAgentSession,
  emptyClarificationSession,
  isClarificationComplete,
  type AgentSession,
  type ClarificationQuestion,
  type ExecutionReport,
} from "./models";

/** Engine + repo dependencies. Engines are optional until their phase lands. */
export interface AgentEngines {
  repo: AgentSessionRepo;
  intent?: IntentEngine;
  clarification?: ClarificationEngine;
  planner?: WorkflowPlanner;
  generator?: WorkflowGenerator;
  validator?: ValidatorAgent;
  testing?: TestingAgent;
  monitoring?: MonitoringAgent;
}

export class EngineNotWiredError extends Error {
  constructor(stage: string) {
    super(`Agent stage "${stage}" invoked but its engine is not wired.`);
    this.name = "EngineNotWiredError";
  }
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Agent session not found: ${sessionId}.`);
    this.name = "SessionNotFoundError";
  }
}

export class AutomationAgentOrchestrator {
  constructor(private readonly deps: AgentEngines) {}

  /* ── internal helpers ──────────────────────────────────────────── */

  private async load(sessionId: string): Promise<AgentSession> {
    const session = await this.deps.repo.get(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);
    return session;
  }

  /**
   * Transition + persist in one place. Asserts the move is legal (throws
   * AgentTransitionError otherwise) so no stage can be skipped.
   */
  private async commit(
    session: AgentSession,
    to: AgentState,
    patch: Partial<AgentSession>,
  ): Promise<AgentSession> {
    assertTransition(session.state, to);
    return this.deps.repo.patch(session.sessionId, { ...patch, state: to });
  }

  private async fail(
    session: AgentSession,
    stage: string,
    reason: string,
  ): Promise<AgentSession> {
    // FAILED is reachable from every working state.
    assertTransition(session.state, "FAILED");
    return this.deps.repo.patch(session.sessionId, {
      state: "FAILED",
      failure: { stage, reason, at: Date.now() },
    });
  }

  /* ── stage 1: intent ───────────────────────────────────────────── */

  async analyzeIntent(sessionId: string, text: string): Promise<AgentSession> {
    if (!this.deps.intent) throw new EngineNotWiredError("intent");
    const session = await this.load(sessionId);
    try {
      const intent = await this.deps.intent.detect({ sessionId, text });
      return this.commit(session, "ANALYZING_INTENT", { intent });
    } catch (err) {
      return this.fail(session, "intent", errMsg(err));
    }
  }

  /* ── stage 2: clarification ────────────────────────────────────── */

  /**
   * Advance clarification with the user's latest message. Stays in
   * COLLECTING_REQUIREMENTS while blocking questions remain; the caller
   * inspects `isClarificationComplete` (re-exported) to decide when to
   * call `plan`.
   */
  async clarify(sessionId: string, latestUserText: string): Promise<AgentSession> {
    if (!this.deps.clarification) throw new EngineNotWiredError("clarification");
    const session = await this.load(sessionId);
    if (!session.intent) {
      return this.fail(session, "clarify", "No intent — run analyzeIntent first.");
    }
    try {
      const current = session.clarification ?? emptyClarificationSession(sessionId);
      const next = this.deps.clarification.advance({
        intent: session.intent,
        session: current,
        latestUserText,
      });
      // Legal into COLLECTING_REQUIREMENTS from ANALYZING_INTENT (first
      // round), self-loop (subsequent rounds), or READY_FOR_DEPLOYMENT
      // (revision) — all enumerated in the transition table.
      return this.commit(session, "COLLECTING_REQUIREMENTS", { clarification: next });
    } catch (err) {
      return this.fail(session, "clarify", errMsg(err));
    }
  }

  /** True when no blocking clarification question remains pending. */
  isReadyToPlan(session: AgentSession): boolean {
    if (!session.clarification) return false;
    return isClarificationComplete(session.clarification);
  }

  /**
   * High-level entry for the live chat route. Ensures a session exists,
   * detects intent exactly once (first turn), advances clarification with
   * the latest user message, persists, and returns the outstanding blocking
   * questions. Empty `questions` ⇒ nothing to ask (proceed to generation /
   * LLM answer).
   *
   * This is the single production clarification path.
   */
  async runClarification(input: {
    sessionId: string;
    userId: string;
    latestUserText: string;
  }): Promise<{ session: AgentSession; questions: ClarificationQuestion[] }> {
    if (!this.deps.clarification) throw new EngineNotWiredError("clarification");

    let session = await this.deps.repo.get(input.sessionId);
    if (!session) {
      session = await this.deps.repo.save(
        emptyAgentSession(input.sessionId, input.userId),
      );
    }

    // Detect intent once (first turn). Later turns reuse the stored intent
    // so requirement derivation stays anchored to the original request.
    if (!session.intent && this.deps.intent) {
      session = await this.analyzeIntent(input.sessionId, input.latestUserText);
      if (session.state === "FAILED") return { session, questions: [] };
    }

    // No intent engine or non-automation text → nothing to clarify.
    if (!session.intent) return { session, questions: [] };

    // Only (re)gather requirements in clarification-eligible states. Once the
    // pipeline has advanced past COLLECTING (planning/generating/deployed/…),
    // a new message is not a clarification answer — skip rather than force an
    // illegal transition.
    const eligible: AgentState[] = [
      "IDLE",
      "ANALYZING_INTENT",
      "COLLECTING_REQUIREMENTS",
      "READY_FOR_DEPLOYMENT",
    ];
    if (!eligible.includes(session.state)) {
      return { session, questions: [] };
    }

    session = await this.clarify(input.sessionId, input.latestUserText);
    if (session.state === "FAILED") return { session, questions: [] };

    const questions = this.deps.clarification.outstanding(
      session.clarification ?? emptyClarificationSession(input.sessionId),
    );
    return { session, questions };
  }

  /* ── stage 3: plan ─────────────────────────────────────────────── */

  async plan(sessionId: string): Promise<AgentSession> {
    if (!this.deps.planner) throw new EngineNotWiredError("planner");
    const session = await this.load(sessionId);
    if (!session.intent || !session.clarification) {
      return this.fail(session, "plan", "Missing intent or clarification.");
    }
    if (!isClarificationComplete(session.clarification)) {
      return this.fail(session, "plan", "Blocking clarification questions remain.");
    }
    try {
      // Version monotonically; never overwrite prior plans.
      const version = (session.plan?.version ?? 0) + 1;
      const plan = this.deps.planner.plan({
        intent: session.intent,
        clarification: session.clarification,
        knownConnections: session.knownConnections,
        version,
      });
      return this.commit(session, "PLANNING_WORKFLOW", {
        plan,
        planHistory: [...session.planHistory, plan],
      });
    } catch (err) {
      return this.fail(session, "plan", errMsg(err));
    }
  }

  /* ── stage 4: generate (Plan → Canonical IR) ───────────────────── */

  async generate(sessionId: string): Promise<AgentSession> {
    if (!this.deps.generator) throw new EngineNotWiredError("generator");
    const session = await this.load(sessionId);
    if (!session.plan) return this.fail(session, "generate", "No plan to generate from.");
    try {
      const version = session.workflowVersion + 1;
      const workflowIR: WorkflowIR = this.deps.generator.generate({
        plan: session.plan,
        version,
      });
      return this.commit(session, "GENERATING_WORKFLOW", {
        workflowIR,
        workflowVersion: version,
      });
    } catch (err) {
      return this.fail(session, "generate", errMsg(err));
    }
  }

  /* ── stage 5: validate ─────────────────────────────────────────── */

  async validate(sessionId: string): Promise<AgentSession> {
    if (!this.deps.validator) throw new EngineNotWiredError("validator");
    const session = await this.load(sessionId);
    if (!session.workflowIR) return this.fail(session, "validate", "No workflow IR.");
    try {
      const validation = this.deps.validator.validate({
        sessionId,
        workflow: session.workflowIR,
        knownConnections: session.knownConnections,
      });
      // Validation runs IN this state; failure routes back to planning.
      const committed = await this.commit(session, "VALIDATING_WORKFLOW", {
        validation,
      });
      return committed;
    } catch (err) {
      return this.fail(session, "validate", errMsg(err));
    }
  }

  /* ── stage 6: test ─────────────────────────────────────────────── */

  async test(sessionId: string): Promise<AgentSession> {
    if (!this.deps.testing) throw new EngineNotWiredError("testing");
    const session = await this.load(sessionId);
    if (!session.workflowIR) return this.fail(session, "test", "No workflow IR.");
    if (!session.validation?.ok) {
      return this.fail(session, "test", "Validation has blocking errors; cannot test.");
    }
    try {
      const test = this.deps.testing.test({ sessionId, workflow: session.workflowIR });
      return this.commit(session, "TESTING_WORKFLOW", { test });
    } catch (err) {
      return this.fail(session, "test", errMsg(err));
    }
  }

  /** Move to READY_FOR_DEPLOYMENT once validation + testing both pass. */
  async markDeployReady(sessionId: string): Promise<AgentSession> {
    const session = await this.load(sessionId);
    if (!session.validation?.ok) {
      return this.fail(session, "deploy-ready", "Validation not passed.");
    }
    if (!session.test?.passed) {
      return this.fail(session, "deploy-ready", "Testing not passed.");
    }
    return this.commit(session, "READY_FOR_DEPLOYMENT", {});
  }

  /* ── stage 8: monitor ──────────────────────────────────────────── */

  async monitor(
    sessionId: string,
    automationId: string,
    report: ExecutionReport,
  ): Promise<AgentSession> {
    if (!this.deps.monitoring) throw new EngineNotWiredError("monitoring");
    const session = await this.load(sessionId);
    try {
      const monitoring = this.deps.monitoring.summarize({ automationId, report });
      return this.commit(session, "MONITORING", { monitoring });
    } catch (err) {
      return this.fail(session, "monitor", errMsg(err));
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
