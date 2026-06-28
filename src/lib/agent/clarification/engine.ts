/**
 * ClarificationEngine — catalog-driven requirement gathering.
 *
 * `advance()` is a pure function of (intent, current session, latest user
 * text). One call per user message. It:
 *
 *   1. Parses the message for answers to currently-pending questions
 *      (multi-answer: each question consumes its own matched span).
 *   2. Applies corrections to already-answered requirements when the
 *      message carries a correction marker ("actually use #marketing").
 *   3. Folds answers into a resolved requirement map (last non-superseded
 *      answer per question wins).
 *   4. Derives the full blocking-requirement set from the intent via the
 *      operation catalog (see requirement-spec).
 *   5. For each requirement not yet represented: auto-resolves it if the
 *      message already supplies the value, else appends a pending question.
 *      Dedup is by requirementKey — a requirement never produces two
 *      questions.
 *
 * Guarantees the prompt asked for:
 *   - only blocking questions are emitted
 *   - never duplicates an answered/pending requirement
 *   - remembers answers (persisted on the session)
 *   - partial answers: unanswered questions stay pending
 *   - multiple answers in one message resolve independently
 *   - corrections supersede prior answers (history retained)
 *   - skips mark a requirement non-blocking (planner defaults it)
 */

import type {
  ClarificationEngine,
  // (interface lives in ../interfaces; re-imported for the implements check)
} from "../interfaces";
import type { AutomationIntent } from "../models/intent";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
  ClarificationSession,
  ResolvedRequirements,
} from "../models/clarification";
import { pendingBlockingQuestions } from "../models/clarification";
import { deriveRequirements, type DerivedRequirement } from "./requirement-spec";
import {
  consumeSpan,
  extract,
  looksLikeCorrection,
  looksLikeSkip,
} from "./extractors";

let monotonic = 0;
function nextId(prefix: string): string {
  monotonic += 1;
  return `${prefix}_${Date.now().toString(36)}_${monotonic.toString(36)}`;
}

/** Fold answers into requirementKey → value (latest non-superseded wins). */
function fold(
  questions: ClarificationQuestion[],
  answers: ClarificationAnswer[],
  supersededIds: string[],
): ResolvedRequirements {
  const superseded = new Set(supersededIds);
  const latestByQuestion = new Map<string, ClarificationAnswer>();
  for (const a of answers) {
    if (superseded.has(a.id)) continue;
    latestByQuestion.set(a.questionId, a); // later index overwrites earlier
  }
  const resolved: ResolvedRequirements = {};
  for (const q of questions) {
    const a = latestByQuestion.get(q.id);
    if (a && !a.skipped && a.value != null) {
      resolved[q.requirementKey] = a.value;
    }
  }
  return resolved;
}

class CatalogClarificationEngine implements ClarificationEngine {
  advance(input: {
    intent: AutomationIntent;
    session: ClarificationSession;
    latestUserText: string;
  }): ClarificationSession {
    const { intent, latestUserText } = input;

    // Work on copies — engines never mutate their inputs.
    const questions: ClarificationQuestion[] = input.session.questions.map((q) => ({ ...q }));
    const answers: ClarificationAnswer[] = input.session.answers.map((a) => ({ ...a }));
    const supersededAnswerIds: string[] = [...input.session.supersededAnswerIds];

    let working = latestUserText ?? "";
    const correcting = looksLikeCorrection(working);

    // ── 1. Resolve currently-pending questions (multi-answer) ───────
    const pending = questions
      .filter((q) => q.status === "pending")
      .sort((a, b) => a.sequence - b.sequence);

    // Skip handling: a bare skip with exactly one pending question skips it.
    if (looksLikeSkip(working) && pending.length === 1) {
      const q = pending[0];
      q.status = "skipped";
      answers.push(skipAnswer(q.id));
    } else {
      for (const q of pending) {
        const ext = extract(q.valueType, working, q.options);
        if (!ext) continue;
        answers.push(answerFrom(q.id, ext.value, sliceSpan(working, ext.span)));
        q.status = "answered";
        working = consumeSpan(working, ext.span);
      }
    }

    // ── 2. Corrections to already-answered requirements ─────────────
    if (correcting) {
      const answered = questions
        .filter((q) => q.status === "answered")
        .sort((a, b) => a.sequence - b.sequence);
      for (const q of answered) {
        const ext = extract(q.valueType, working, q.options);
        if (!ext) continue;
        // Supersede the prior live answer for this question.
        const prior = [...answers]
          .reverse()
          .find((a) => a.questionId === q.id && !supersededAnswerIds.includes(a.id));
        const newValue = ext.value;
        if (prior && JSON.stringify(prior.value) === JSON.stringify(newValue)) continue;
        if (prior) supersededAnswerIds.push(prior.id);
        answers.push(answerFrom(q.id, newValue, sliceSpan(working, ext.span)));
        working = consumeSpan(working, ext.span);
      }
    }

    // ── 3. Fold what we have so far ─────────────────────────────────
    let resolved = fold(questions, answers, supersededAnswerIds);

    // ── 4. Derive the full requirement set from the catalog ─────────
    const requirements = deriveRequirements(intent);
    const haveQuestionFor = new Set(questions.map((q) => q.requirementKey));

    // ── 5. For each requirement not yet represented: auto-resolve or ask ──
    for (const req of requirements) {
      if (haveQuestionFor.has(req.requirementKey)) continue; // dedup
      if (resolved[req.requirementKey] != null) continue; // already known

      const ext = extract(req.valueType, working, req.options);
      if (ext) {
        // The message already supplied this — record as answered, don't ask.
        const q = questionFrom(req, questions.length, "answered");
        questions.push(q);
        answers.push(answerFrom(q.id, ext.value, sliceSpan(working, ext.span)));
        working = consumeSpan(working, ext.span);
      } else {
        questions.push(questionFrom(req, questions.length, "pending"));
      }
      haveQuestionFor.add(req.requirementKey);
    }

    // ── 6. Recompute the resolved view ──────────────────────────────
    resolved = fold(questions, answers, supersededAnswerIds);

    return {
      sessionId: input.session.sessionId,
      questions,
      answers,
      resolved,
      supersededAnswerIds,
      updatedAt: Date.now(),
    };
  }

  outstanding(session: ClarificationSession): ClarificationQuestion[] {
    return pendingBlockingQuestions(session);
  }
}

/* ── small builders ───────────────────────────────────────────────── */

function questionFrom(
  req: DerivedRequirement,
  sequence: number,
  status: ClarificationQuestion["status"],
): ClarificationQuestion {
  return {
    id: nextId("q"),
    requirementKey: req.requirementKey,
    prompt: req.prompt,
    valueType: req.valueType,
    options: req.options,
    blocking: req.blocking,
    status,
    sequence,
    createdAt: Date.now(),
  };
}

function answerFrom(
  questionId: string,
  value: string | string[],
  rawText: string,
): ClarificationAnswer {
  return {
    id: nextId("a"),
    questionId,
    rawText,
    value,
    skipped: false,
    createdAt: Date.now(),
  };
}

function skipAnswer(questionId: string): ClarificationAnswer {
  return {
    id: nextId("a"),
    questionId,
    rawText: "",
    value: null,
    skipped: true,
    createdAt: Date.now(),
  };
}

function sliceSpan(text: string, span: [number, number]): string {
  return text.slice(span[0], span[1]).trim();
}

/** Singleton — the engine is stateless, so one instance is fine. */
export const clarificationEngine: ClarificationEngine = new CatalogClarificationEngine();
