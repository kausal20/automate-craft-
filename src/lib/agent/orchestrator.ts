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

import {
  assertTransition,
  type AgentState,
} from "./state-machine";
import {
  STAGE_LABEL,
  type PipelineEmit,
  type PipelineErrorCode,
  type PipelineStage,
} from "./pipeline";
import { projectIRToCanvas } from "./projection";
import type {
  IntentEngine,
  ClarificationEngine,
  WorkflowPlanner,
  WorkflowGenerator,
  ValidatorAgent,
  TestingAgent,
  DeploymentAgent,
  MonitoringAgent,
  OptimizationAgent,
  AgentSessionRepo,
  ConnectionProvider,
} from "./interfaces";
import {
  emptyAgentSession,
  emptyClarificationSession,
  isClarificationComplete,
  type AgentSession,
  type CredentialObservation,
  type ExecutionRecord,
  type NodeExecutionRecord,
  type RuntimeEventRecord,
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
  deployment?: DeploymentAgent;
  monitoring?: MonitoringAgent;
  optimization?: OptimizationAgent;
  /** Supplies the user's real connections at the start of every run. */
  connections?: ConnectionProvider;
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
    // Only a plan without blocking issues may be lowered into IR.
    if (!session.plan.ok) {
      return this.fail(
        session,
        "generate",
        "Plan has blocking issues; cannot generate workflow IR.",
      );
    }
    try {
      // Revision monotonically; prior IR revisions are retained for rollback.
      const version = session.workflowVersion + 1;
      const workflowIR = this.deps.generator.generate({
        plan: session.plan,
        version,
      });
      return this.commit(session, "GENERATING_WORKFLOW", {
        workflowIR,
        workflowIRHistory: [...session.workflowIRHistory, workflowIR],
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
        // The Validator inspects the whole IR document (core + graph +
        // variables + mappings + schemas + metadata).
        ir: session.workflowIR,
        knownConnections: session.knownConnections,
      });
      // Validation runs IN this state; a failing report does NOT throw —
      // the report itself carries the BLOCKED verdict. Reports are appended,
      // never overwritten.
      return this.commit(session, "VALIDATING_WORKFLOW", {
        validation,
        validationHistory: [...session.validationHistory, validation],
      });
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
      const test = await this.deps.testing.test({
        sessionId,
        userId: session.userId,
        // The Testing Agent simulates the whole IR document.
        ir: session.workflowIR,
        validation: session.validation,
        knownConnections: session.knownConnections,
      });
      // Reports are appended, never overwritten.
      return this.commit(session, "TESTING_WORKFLOW", {
        test,
        testHistory: [...session.testHistory, test],
      });
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
    // `test.passed` is a module COUNT, not a boolean — the verdict is the
    // report's recommendation.
    if (!session.test || session.test.deploymentRecommendation === "DO_NOT_DEPLOY") {
      return this.fail(session, "deploy-ready", "Testing did not clear this workflow.");
    }
    return this.commit(session, "READY_FOR_DEPLOYMENT", {});
  }

  /* ── stage 7: deploy ───────────────────────────────────────────── */

  /**
   * Deploy the current IR revision to n8n. The agent returns a structured
   * report on every path; a failed deployment is persisted (with its rollback
   * record) and routes the session to FAILED rather than throwing.
   */
  async deploy(sessionId: string): Promise<AgentSession> {
    if (!this.deps.deployment) throw new EngineNotWiredError("deployment");
    const session = await this.load(sessionId);
    if (!session.workflowIR) return this.fail(session, "deploy", "No workflow IR.");
    if (!session.validation?.ok) {
      return this.fail(session, "deploy", "Validation has blocking errors; cannot deploy.");
    }
    if (session.test?.deploymentRecommendation === "DO_NOT_DEPLOY") {
      return this.fail(session, "deploy", "Testing recommended against deploying.");
    }

    try {
      const previous =
        session.externalWorkflowId && session.deployedRevision !== null
          ? {
              workflowId: session.externalWorkflowId,
              revision: session.deployedRevision,
              active: session.activationState === "ACTIVE",
            }
          : null;

      const report = await this.deps.deployment.deploy({
        sessionId,
        userId: session.userId,
        ir: session.workflowIR,
        validation: session.validation,
        test: session.test,
        previous,
      });

      // History is append-only regardless of outcome — a failed deployment is
      // part of the record.
      const patch: Partial<AgentSession> = {
        deployment: report,
        deploymentHistory: [...session.deploymentHistory, report],
      };

      if (report.status === "DEPLOYED") {
        patch.externalWorkflowId = report.workflowId;
        patch.activationState = report.activationStatus;
        patch.deployedRevision = report.revision;
        return this.commit(session, "DEPLOYING", patch);
      }

      // Persist the failed report, then mark the session FAILED.
      await this.deps.repo.patch(sessionId, patch);
      const reloaded = await this.load(sessionId);
      return this.fail(
        reloaded,
        "deploy",
        report.errors[0]?.message ?? "Deployment did not complete.",
      );
    } catch (err) {
      return this.fail(session, "deploy", errMsg(err));
    }
  }

  /* ── stage 8: monitor ──────────────────────────────────────────── */

  /**
   * Run one monitoring cycle over observed runtime history.
   *
   * History is supplied by the caller (whatever collected it from the runtime
   * store), keeping the agent a pure function and the report reproducible.
   * Reports are appended, never overwritten, so trends can be read from
   * `monitoringHistory`.
   */
  async monitor(
    sessionId: string,
    observed: {
      executions: ExecutionRecord[];
      nodeExecutions: NodeExecutionRecord[];
      runtimeEvents: RuntimeEventRecord[];
      credentials: CredentialObservation[];
      now?: number;
    },
  ): Promise<AgentSession> {
    if (!this.deps.monitoring) throw new EngineNotWiredError("monitoring");
    const session = await this.load(sessionId);
    try {
      const monitoring = this.deps.monitoring.observe({
        sessionId,
        ir: session.workflowIR,
        deployment: session.deployment,
        executions: observed.executions,
        nodeExecutions: observed.nodeExecutions,
        runtimeEvents: observed.runtimeEvents,
        credentials: observed.credentials,
        now: observed.now ?? Date.now(),
      });
      return this.commit(session, "MONITORING", {
        monitoring,
        monitoringHistory: [...session.monitoringHistory, monitoring],
      });
    } catch (err) {
      return this.fail(session, "monitor", errMsg(err));
    }
  }

  /* ── the production pipeline ───────────────────────────────────── */

  /**
   * Drive the whole pipeline for one user message. THE production entry point.
   *
   *   intent → clarify → plan → generate → validate → test
   *          → deploy-ready → deploy → monitor → optimize
   *
   * Resumable, not restartable. Every stage is guarded by the artifact it
   * produces, so a stage that already ran is skipped rather than repeated —
   * each phase executes at most once per session. A reload mid-pipeline picks
   * up at the first stage with no artifact; a clarification answer resumes at
   * `clarify` instead of re-detecting intent.
   *
   * Persistence happens inside each stage (via `commit`), not at the end, so a
   * crash after validation resumes from validation.
   *
   * Stops dead on the first blocking failure. Nothing downstream of a failure
   * runs, and no event claims work that did not happen.
   */
  async run(input: {
    sessionId: string;
    userId: string;
    latestUserText: string;
    /**
     * Observed runtime history for the monitoring stage. A freshly deployed
     * workflow has none — the Monitoring Agent then reports UNKNOWN and the
     * Optimization Agent withholds advice, which is the honest outcome. Never
     * synthesise records here to make the pipeline look complete.
     */
    observed?: {
      executions: ExecutionRecord[];
      nodeExecutions: NodeExecutionRecord[];
      runtimeEvents: RuntimeEventRecord[];
      credentials: CredentialObservation[];
      now?: number;
    };
    emit?: PipelineEmit;
  }): Promise<AgentSession> {
    const emit: PipelineEmit = input.emit ?? (() => {});
    const completed: PipelineStage[] = [];
    const at = () => Date.now();

    const started = (stage: PipelineStage) =>
      emit({ type: "stage_started", stage, label: STAGE_LABEL[stage], at: at() });
    const done = (stage: PipelineStage, state: AgentState, detail: string) => {
      completed.push(stage);
      emit({ type: "stage_completed", stage, state, detail, at: at() });
    };
    /**
     * Reuse a stage's existing artifact instead of re-running its engine.
     *
     * Skipping the WORK must not skip the STATE. The state machine enumerates
     * a path, not a set, so a resumed session still has to walk through each
     * stage's state — otherwise it arrives at a later stage from a state that
     * cannot legally reach it. The transition is only replayed when the
     * session has not already progressed past that stage.
     */
    const skip = async (stage: PipelineStage, reason: string) => {
      emit({ type: "stage_skipped", stage, reason, at: at() });
      const target = STAGE_STATE_FOR[stage];
      if (STATE_ORDER[session.state] < STATE_ORDER[target]) {
        session = await this.commit(session, target, {});
      }
    };
    const failEvent = (stage: PipelineStage, code: PipelineErrorCode, reason: string) =>
      emit({ type: "stage_failed", stage, code, reason, at: at() });
    const finish = (session: AgentSession) => {
      emit({ type: "pipeline_finished", state: session.state, completed, at: at() });
      return session;
    };
    const reasonOf = (session: AgentSession, fallback: string) =>
      session.failure?.reason ?? fallback;

    /* ── session ───────────────────────────────────────────────── */
    let session =
      (await this.deps.repo.get(input.sessionId)) ??
      (await this.deps.repo.save(emptyAgentSession(input.sessionId, input.userId)));

    // FAILED is terminal until an explicit reset. A new user message IS that
    // reset — the user has seen the failure and is trying again.
    //
    // The retry must clear the failed stage's artifact and everything
    // downstream of it. Without that, the resume guards below would see the
    // BAD artifact still sitting there, skip the very stage that failed, and
    // fail again on the same input forever.
    if (session.state === "FAILED") {
      session = await this.deps.repo.patch(input.sessionId, {
        state: "IDLE",
        failure: null,
        ...clearFrom(session.failure?.stage),
      });
    }

    // Re-read connections every run. Credentials change between messages, and
    // the Planner and Validator must both see the current truth — a stale
    // snapshot would either block a workflow the user just connected or claim
    // a revoked credential still works.
    if (this.deps.connections) {
      const knownConnections = await this.deps.connections.list(session.userId);
      session = await this.deps.repo.patch(input.sessionId, { knownConnections });
    }

    /* ── 1. intent ─────────────────────────────────────────────── */
    // Runs when there is no intent yet, and again from IDLE — a retry resets
    // to IDLE, and IDLE's only legal exit is ANALYZING_INTENT. Skipping intent
    // there would strand the session with nowhere legal to go.
    if (!session.intent || session.state === "IDLE") {
      started("intent");
      session = await this.analyzeIntent(input.sessionId, input.latestUserText);
      if (session.state === "FAILED") {
        failEvent("intent", "INTENT_FAILED", reasonOf(session, "Intent detection failed."));
        return finish(session);
      }
      done(
        "intent",
        session.state,
        session.intent?.isAutomationRequest
          ? `Identified ${session.intent.integrations.length} integration(s).`
          : "Not an automation request.",
      );
    } else {
      await skip("intent", "Intent already detected for this session.");
    }

    // No intent engine wired, or the message is not an automation request.
    // Neither is a failure: there is simply no workflow to build, and the
    // caller answers conversationally. Running the build stages anyway would
    // manufacture a workflow the user never asked for.
    if (!session.intent || !session.intent.isAutomationRequest) {
      return finish(session);
    }

    /* ── 2. clarify ────────────────────────────────────────────── */
    // Only re-gather requirements while the session is still in a
    // clarification-eligible state. Past that point a new message is not an
    // answer to a pending question, and forcing the transition would be
    // illegal.
    const clarifyEligible: AgentState[] = [
      "IDLE",
      "ANALYZING_INTENT",
      "COLLECTING_REQUIREMENTS",
      "READY_FOR_DEPLOYMENT",
    ];
    if (clarifyEligible.includes(session.state)) {
      if (!this.deps.clarification) throw new EngineNotWiredError("clarification");
      started("clarify");
      session = await this.clarify(input.sessionId, input.latestUserText);
      if (session.state === "FAILED") {
        failEvent("clarify", "CLARIFICATION_FAILED", reasonOf(session, "Clarification failed."));
        return finish(session);
      }

      const outstanding = this.deps.clarification.outstanding(
        session.clarification ?? emptyClarificationSession(input.sessionId),
      );
      if (outstanding.length > 0) {
        // PAUSE — not a failure. The session stays in COLLECTING_REQUIREMENTS
        // and the next message resumes here, never from the top.
        emit({
          type: "clarification_required",
          questions: outstanding.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            requirementKey: q.requirementKey,
            blocking: q.blocking,
          })),
          at: at(),
        });
        return finish(session);
      }
      done("clarify", session.state, "All required details resolved.");
    } else {
      await skip("clarify", "Requirements already resolved.");
    }

    /* ── 3. plan ───────────────────────────────────────────────── */
    if (!session.plan) {
      started("plan");
      session = await this.plan(input.sessionId);
      if (session.state === "FAILED") {
        failEvent("plan", "PLANNING_FAILED", reasonOf(session, "Planning failed."));
        return finish(session);
      }
      done("plan", session.state, `${session.plan?.steps.length ?? 0} step(s) planned.`);
    } else {
      await skip("plan", "Plan already exists for this session.");
    }

    // A plan carrying blocking issues cannot be lowered into IR. Stop here
    // with the planner's own reason rather than letting generation fail with
    // a vaguer one.
    if (session.plan && !session.plan.ok) {
      const issue = session.plan.issues.find((i) => i.severity === "error");
      const reason = issue?.message ?? "The plan has blocking issues.";
      session = await this.fail(session, "plan", reason);
      failEvent("plan", "PLANNING_FAILED", reason);
      return finish(session);
    }

    /* ── 4. generate ───────────────────────────────────────────── */
    if (!session.workflowIR) {
      started("generate");
      session = await this.generate(input.sessionId);
      if (session.state === "FAILED") {
        failEvent("generate", "GENERATION_FAILED", reasonOf(session, "Generation failed."));
        return finish(session);
      }
      done(
        "generate",
        session.state,
        `Workflow IR revision ${session.workflowIR?.revision ?? 0} with ${
          session.workflowIR?.graph.nodes.length ?? 0
        } node(s).`,
      );
    } else {
      await skip("generate", "Workflow IR already generated.");
    }

    // Publish the canvas view of the IR. Emitted on both the fresh and the
    // resumed path so a reloaded session still renders its workflow.
    if (session.workflowIR) {
      emit({
        type: "workflow_generated",
        workflow: projectIRToCanvas(session.workflowIR),
        at: at(),
      });
    }

    /* ── 5. validate ───────────────────────────────────────────── */
    if (!session.validation) {
      started("validate");
      session = await this.validate(input.sessionId);
      if (session.state === "FAILED") {
        failEvent("validate", "VALIDATION_FAILED", reasonOf(session, "Validation failed."));
        return finish(session);
      }
      done(
        "validate",
        session.state,
        session.validation?.ok
          ? "Validation passed."
          : `${session.validation?.summary.errorCount ?? 0} blocking issue(s).`,
      );
    } else {
      await skip("validate", "Validation report already exists.");
    }

    // BLOCKED is a real verdict, not an exception — the report exists and is
    // persisted. The pipeline still stops: never deploy a workflow the
    // Validator rejected.
    if (!session.validation?.ok) {
      const reason =
        session.validation?.issues.find((i) => i.severity === "error")?.message ??
        "Validation blocked this workflow.";
      session = await this.fail(session, "validate", reason);
      failEvent("validate", "VALIDATION_FAILED", reason);
      return finish(session);
    }

    /* ── 6. test ───────────────────────────────────────────────── */
    if (!session.test) {
      started("test");
      session = await this.test(input.sessionId);
      if (session.state === "FAILED") {
        failEvent("test", "TESTING_FAILED", reasonOf(session, "Testing failed."));
        return finish(session);
      }
      done(
        "test",
        session.state,
        `Testing recommendation: ${session.test?.deploymentRecommendation ?? "UNKNOWN"}.`,
      );
    } else {
      await skip("test", "Test report already exists.");
    }

    if (session.test?.deploymentRecommendation === "DO_NOT_DEPLOY") {
      const reason =
        session.test.issues.find((i) => i.severity === "error")?.message ??
        "Testing recommended against deploying this workflow.";
      session = await this.fail(session, "test", reason);
      failEvent("test", "TESTING_FAILED", reason);
      return finish(session);
    }

    /* ── 7. deploy-ready ───────────────────────────────────────── */
    if (session.state !== "READY_FOR_DEPLOYMENT" && !session.deployment) {
      started("deploy-ready");
      session = await this.markDeployReady(input.sessionId);
      if (session.state === "FAILED") {
        failEvent("deploy-ready", "DEPLOY_BLOCKED", reasonOf(session, "Not ready to deploy."));
        return finish(session);
      }
      done("deploy-ready", session.state, "Cleared for deployment.");
    } else {
      await skip("deploy-ready", "Already cleared for deployment.");
    }

    /* ── 8. deploy ─────────────────────────────────────────────── */
    if (!session.deployment || session.deployment.status !== "DEPLOYED") {
      started("deploy");
      session = await this.deploy(input.sessionId);
      // The report is persisted on every path, including failure.
      const report = session.deployment;
      if (report) {
        emit({
          type: "deployment_finished",
          status: report.status,
          workflowId: report.workflowId,
          activationStatus: report.activationStatus,
          at: at(),
        });
      }
      if (session.state === "FAILED") {
        failEvent("deploy", "DEPLOYMENT_FAILED", reasonOf(session, "Deployment failed."));
        return finish(session);
      }
      done("deploy", session.state, `Deployed as ${report?.workflowId ?? "unknown"}.`);
    } else {
      await skip("deploy", "Workflow already deployed.");
    }

    /* ── 9. monitor ────────────────────────────────────────────── */
    if (!session.monitoring) {
      started("monitor");
      session = await this.monitor(input.sessionId, {
        executions: input.observed?.executions ?? [],
        nodeExecutions: input.observed?.nodeExecutions ?? [],
        runtimeEvents: input.observed?.runtimeEvents ?? [],
        credentials: input.observed?.credentials ?? [],
        ...(input.observed?.now !== undefined ? { now: input.observed.now } : {}),
      });
      if (session.state === "FAILED") {
        failEvent("monitor", "MONITORING_UNAVAILABLE", reasonOf(session, "Monitoring failed."));
        return finish(session);
      }
      // A just-deployed workflow has no runs yet. UNKNOWN is the correct
      // answer, and saying so beats implying health nobody observed.
      done(
        "monitor",
        session.state,
        `Health: ${session.monitoring?.health ?? "UNKNOWN"} over ${
          session.monitoring?.execution.total ?? 0
        } observed run(s).`,
      );
    } else {
      await skip("monitor", "Monitoring report already exists.");
    }

    /* ── 10. optimize ──────────────────────────────────────────── */
    if (!session.optimization) {
      started("optimize");
      session = await this.optimize(input.sessionId);
      if (session.state === "FAILED") {
        failEvent("optimize", "OPTIMIZATION_FAILED", reasonOf(session, "Optimization failed."));
        return finish(session);
      }
      const opt = session.optimization;
      emit({
        type: "optimization_finished",
        score: opt?.scores.optimization ?? null,
        recommendations: opt?.recommendations.length ?? 0,
        at: at(),
      });
      done("optimize", session.state, opt?.summary ?? "No optimization report produced.");
    } else {
      await skip("optimize", "Optimization report already exists.");
    }

    return finish(session);
  }

  /* ── stage 9: optimize ─────────────────────────────────────────── */

  /**
   * Run ONE optimization cycle over the artifacts already on the session.
   *
   * Reads only — the IR, the deployment, and the production workflow are all
   * left untouched; the output is a set of proposals for a human to accept.
   * Every input comes from session state, so the cycle is reproducible: the
   * same session yields the same report. Reports are appended, never
   * overwritten, so `optimizationHistory` supports longitudinal comparison.
   */
  async optimize(sessionId: string): Promise<AgentSession> {
    if (!this.deps.optimization) throw new EngineNotWiredError("optimization");
    const session = await this.load(sessionId);
    try {
      const optimization = this.deps.optimization.analyze({
        sessionId,
        ir: session.workflowIR,
        validation: session.validation,
        test: session.test,
        deployment: session.deployment,
        monitoring: session.monitoring,
      });
      return this.commit(session, "OPTIMIZING", {
        optimization,
        optimizationHistory: [...session.optimizationHistory, optimization],
      });
    } catch (err) {
      return this.fail(session, "optimize", errMsg(err));
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** The state a session occupies once a stage has been completed. */
const STAGE_STATE_FOR: Record<PipelineStage, AgentState> = {
  intent: "ANALYZING_INTENT",
  clarify: "COLLECTING_REQUIREMENTS",
  plan: "PLANNING_WORKFLOW",
  generate: "GENERATING_WORKFLOW",
  validate: "VALIDATING_WORKFLOW",
  test: "TESTING_WORKFLOW",
  "deploy-ready": "READY_FOR_DEPLOYMENT",
  deploy: "DEPLOYING",
  monitor: "MONITORING",
  optimize: "OPTIMIZING",
};

/**
 * How far along the pipeline each state sits. Lets a resumed run tell "not
 * there yet" (replay the transition) from "already past it" (leave alone).
 * FAILED is off the path and never compared.
 */
const STATE_ORDER: Record<AgentState, number> = {
  IDLE: 0,
  ANALYZING_INTENT: 1,
  COLLECTING_REQUIREMENTS: 2,
  PLANNING_WORKFLOW: 3,
  GENERATING_WORKFLOW: 4,
  VALIDATING_WORKFLOW: 5,
  TESTING_WORKFLOW: 6,
  READY_FOR_DEPLOYMENT: 7,
  DEPLOYING: 8,
  MONITORING: 9,
  OPTIMIZING: 10,
  FAILED: -1,
};

/**
 * Artifacts produced by each stage, in pipeline order. Used to decide what a
 * retry must discard.
 */
const STAGE_ARTIFACTS: Array<{ stage: string; keys: Array<keyof AgentSession> }> = [
  { stage: "intent", keys: ["intent"] },
  { stage: "clarify", keys: ["clarification"] },
  { stage: "plan", keys: ["plan"] },
  { stage: "generate", keys: ["workflowIR"] },
  { stage: "validate", keys: ["validation"] },
  { stage: "test", keys: ["test"] },
  { stage: "deploy-ready", keys: [] },
  { stage: "deploy", keys: ["deployment"] },
  { stage: "monitor", keys: ["monitoring"] },
  { stage: "optimize", keys: ["optimization"] },
];

/**
 * Null out the failed stage's artifact and every artifact after it, so a retry
 * genuinely re-runs from the failure instead of inheriting the bad result.
 *
 * History arrays are deliberately untouched: they are append-only records of
 * what happened, and a failed attempt is part of that record.
 */
function clearFrom(failedStage: string | undefined): Partial<AgentSession> {
  if (!failedStage) return {};
  const index = STAGE_ARTIFACTS.findIndex((s) => s.stage === failedStage);
  if (index < 0) return {};

  const patch: Partial<AgentSession> = {};
  for (const { keys } of STAGE_ARTIFACTS.slice(index)) {
    for (const key of keys) {
      // Every cleared artifact is a nullable pointer to the latest result.
      (patch as Record<string, unknown>)[key] = null;
    }
  }
  return patch;
}
