/**
 * Automation Agent state machine.
 *
 * One session always has exactly one active state. Transitions are
 * enumerated explicitly — `assertTransition` throws on illegal moves so
 * orchestration bugs surface immediately rather than silently corrupting
 * session state.
 *
 * The pipeline is strictly ordered:
 *
 *   IDLE
 *     → ANALYZING_INTENT
 *     → COLLECTING_REQUIREMENTS   (clarification loop; self-transition allowed)
 *     → PLANNING_WORKFLOW
 *     → GENERATING_WORKFLOW
 *     → VALIDATING_WORKFLOW
 *     → TESTING_WORKFLOW
 *     → READY_FOR_DEPLOYMENT
 *     → DEPLOYING
 *     → MONITORING
 *     → OPTIMIZING                (optional; loops back via re-plan)
 *
 * FAILED is reachable from any working state and is terminal until the
 * caller explicitly resets to IDLE (e.g. user edits the request).
 *
 * No stage may be skipped. The orchestrator drives transitions one step
 * at a time; this module only decides which moves are legal.
 */

export const AGENT_STATES = [
  "IDLE",
  "ANALYZING_INTENT",
  "COLLECTING_REQUIREMENTS",
  "PLANNING_WORKFLOW",
  "GENERATING_WORKFLOW",
  "VALIDATING_WORKFLOW",
  "TESTING_WORKFLOW",
  "READY_FOR_DEPLOYMENT",
  "DEPLOYING",
  "MONITORING",
  "OPTIMIZING",
  "FAILED",
] as const;

export type AgentState = (typeof AGENT_STATES)[number];

/**
 * Legal forward transitions per state.
 *
 * Notes:
 *   - COLLECTING_REQUIREMENTS self-loops: each unanswered clarification
 *     round re-enters the same state until all blocking questions resolve.
 *   - Every non-terminal state may jump to FAILED.
 *   - READY_FOR_DEPLOYMENT can loop back to COLLECTING_REQUIREMENTS when
 *     the user revises the request before deploying.
 *   - MONITORING → OPTIMIZING → PLANNING_WORKFLOW closes the improvement
 *     loop without forcing a full reset.
 *   - FAILED → IDLE is the only escape (explicit reset).
 */
const TRANSITIONS: Record<AgentState, readonly AgentState[]> = {
  IDLE: ["ANALYZING_INTENT", "FAILED"],
  ANALYZING_INTENT: ["COLLECTING_REQUIREMENTS", "PLANNING_WORKFLOW", "FAILED"],
  COLLECTING_REQUIREMENTS: [
    "COLLECTING_REQUIREMENTS",
    "PLANNING_WORKFLOW",
    "FAILED",
  ],
  PLANNING_WORKFLOW: ["GENERATING_WORKFLOW", "FAILED"],
  GENERATING_WORKFLOW: ["VALIDATING_WORKFLOW", "FAILED"],
  VALIDATING_WORKFLOW: [
    "TESTING_WORKFLOW",
    // validation failure routes back to planning for a corrected plan
    "PLANNING_WORKFLOW",
    "FAILED",
  ],
  TESTING_WORKFLOW: [
    "READY_FOR_DEPLOYMENT",
    // test failure routes back to planning
    "PLANNING_WORKFLOW",
    "FAILED",
  ],
  READY_FOR_DEPLOYMENT: [
    "DEPLOYING",
    "COLLECTING_REQUIREMENTS",
    "FAILED",
  ],
  DEPLOYING: ["MONITORING", "FAILED"],
  MONITORING: ["OPTIMIZING", "FAILED"],
  OPTIMIZING: ["PLANNING_WORKFLOW", "MONITORING", "FAILED"],
  FAILED: ["IDLE"],
};

export function isAgentTransitionAllowed(
  from: AgentState,
  to: AgentState,
): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Legal next states from `from` (for UI affordances + tests). */
export function allowedNextStates(from: AgentState): readonly AgentState[] {
  return TRANSITIONS[from];
}

export class AgentTransitionError extends Error {
  constructor(
    readonly from: AgentState,
    readonly to: AgentState,
  ) {
    super(`Illegal agent transition: ${from} → ${to}.`);
    this.name = "AgentTransitionError";
  }
}

/**
 * Assert + return the target state. Throws `AgentTransitionError` on an
 * illegal move so the orchestrator can never advance through a skipped
 * stage.
 */
export function assertTransition(from: AgentState, to: AgentState): AgentState {
  if (!isAgentTransitionAllowed(from, to)) {
    throw new AgentTransitionError(from, to);
  }
  return to;
}

/** Terminal states carry no outgoing pipeline work. */
export function isTerminalState(state: AgentState): boolean {
  return state === "FAILED";
}

/**
 * Maps each pipeline stage to the state the agent occupies WHILE running
 * it. Used by the orchestrator to set state before invoking an engine.
 */
export const STAGE_STATE: Record<string, AgentState> = {
  intent: "ANALYZING_INTENT",
  clarify: "COLLECTING_REQUIREMENTS",
  plan: "PLANNING_WORKFLOW",
  generate: "GENERATING_WORKFLOW",
  validate: "VALIDATING_WORKFLOW",
  test: "TESTING_WORKFLOW",
  deploy: "DEPLOYING",
  monitor: "MONITORING",
};
