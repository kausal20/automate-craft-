/**
 * Clarification domain models.
 *
 * The clarification engine (Phase B) drives requirement-gathering. These
 * are the persisted shapes — pure data, no behavior. Engine logic lives
 * in `agent/clarification/`.
 *
 * Design rules baked into the model:
 *   - Each question targets exactly ONE missing requirement (`requirementKey`),
 *     derived from the operation catalog's required params — never hardcoded.
 *   - Answers are linked to questions by `questionId`, so multiple answers
 *     in one user message resolve independently.
 *   - A question carries its own resolution predicate metadata so the engine
 *     can re-check it against accumulated answers and auto-remove it.
 *   - Corrections overwrite the prior answer for the same `questionId`;
 *     history is retained via `supersededAnswerIds`.
 */

/** What kind of value a question expects — drives parsing + UI hints. */
export type ClarificationValueType =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "channel" // slack #channel, whatsapp group, etc.
  | "identifier" // form id, sheet id, base id
  | "fieldList" // which payload fields to include
  | "integration" // which CRM / which provider
  | "enum"; // one of a fixed option set

export type ClarificationQuestionStatus =
  | "pending" // asked, awaiting answer
  | "answered" // resolved with a usable answer
  | "skipped" // user explicitly declined; engine must fall back to a default
  | "superseded"; // replaced by a corrected question

export interface ClarificationQuestion {
  id: string;
  /**
   * Stable key identifying WHICH requirement this question fills.
   * Format: `<integration>.<operation>.<param>` or `trigger.source`,
   * `trigger.event`. Used for dedup — the engine never emits two pending
   * questions with the same requirementKey.
   */
  requirementKey: string;
  /** Human-readable prompt shown to the user. */
  prompt: string;
  valueType: ClarificationValueType;
  /** For enum value types — the allowed options. */
  options?: string[];
  /**
   * Whether this question BLOCKS workflow generation. Only blocking
   * questions are asked; non-blocking gaps fall back to documented
   * defaults during planning.
   */
  blocking: boolean;
  status: ClarificationQuestionStatus;
  /** Creation order — used to sequence questions deterministically. */
  sequence: number;
  createdAt: number;
}

export interface ClarificationAnswer {
  id: string;
  questionId: string;
  /** Raw user text fragment attributed to this answer. */
  rawText: string;
  /**
   * Normalized value extracted from rawText (e.g. E.164 phone, lowercased
   * email, parsed field list). `null` when the user skipped.
   */
  value: string | string[] | null;
  /** True when the user explicitly declined to answer. */
  skipped: boolean;
  createdAt: number;
}

/**
 * Resolved fact map: requirementKey → normalized value. Built by folding
 * answers over questions. This is what the planner consumes — it never
 * re-parses raw text.
 */
export type ResolvedRequirements = Record<string, string | string[] | null>;

export interface ClarificationSession {
  /** One clarification session per agent session. */
  sessionId: string;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
  /** Folded view — requirementKey → value. Derived, persisted for speed. */
  resolved: ResolvedRequirements;
  /** Answers replaced by corrections, retained for audit. */
  supersededAnswerIds: string[];
  updatedAt: number;
}

/** Empty clarification session factory. */
export function emptyClarificationSession(sessionId: string): ClarificationSession {
  return {
    sessionId,
    questions: [],
    answers: [],
    resolved: {},
    supersededAnswerIds: [],
    updatedAt: Date.now(),
  };
}

/** True when no blocking question remains pending. */
export function isClarificationComplete(session: ClarificationSession): boolean {
  return !session.questions.some(
    (q) => q.blocking && q.status === "pending",
  );
}

/** Pending blocking questions, in sequence order. */
export function pendingBlockingQuestions(
  session: ClarificationSession,
): ClarificationQuestion[] {
  return session.questions
    .filter((q) => q.blocking && q.status === "pending")
    .sort((a, b) => a.sequence - b.sequence);
}
