/**
 * GET /api/agent-session/[sessionId] — session restoration.
 *
 * Returns everything a reloading browser needs to rebuild the pipeline view
 * exactly as it was: the current phase, every artifact produced so far, and
 * whether the pipeline is paused on a clarification question.
 *
 * Read-only. Reloading a page must never advance the pipeline, so this route
 * touches no engine and mutates nothing — it reads the persisted session and
 * returns it. Because each stage persists as it completes, a crash mid-run
 * leaves the last completed stage's artifacts here, and the next message
 * resumes from exactly that point.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api";
import { agentSessionRepo, isClarificationComplete } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Authentication required.", 401);

    const { sessionId } = await params;
    const session = await agentSessionRepo.get(sessionId);

    // No session yet is a normal state for a fresh chat, not an error.
    if (!session) {
      return NextResponse.json({ exists: false, session: null });
    }

    // A session belongs to the user who created it. Never serve someone
    // else's workflow, reports, or business data.
    if (session.userId !== user.id) {
      return jsonError("Not found.", 404);
    }

    const pendingQuestions =
      session.clarification && !isClarificationComplete(session.clarification)
        ? session.clarification.questions
            .filter((q) => q.status === "pending" && q.blocking)
            .map((q) => ({
              id: q.id,
              prompt: q.prompt,
              requirementKey: q.requirementKey,
              blocking: q.blocking,
            }))
        : [];

    return NextResponse.json({
      exists: true,
      session: {
        sessionId: session.sessionId,
        state: session.state,
        failure: session.failure,

        intent: session.intent,
        clarification: session.clarification,
        plan: session.plan,

        // The canonical IR — the only workflow representation.
        workflowIR: session.workflowIR,
        workflowVersion: session.workflowVersion,

        validation: session.validation,
        test: session.test,
        deployment: session.deployment,
        monitoring: session.monitoring,
        optimization: session.optimization,

        externalWorkflowId: session.externalWorkflowId,
        activationState: session.activationState,
        deployedRevision: session.deployedRevision,

        // Append-only history — supports rollback + longitudinal comparison.
        history: {
          plans: session.planHistory.length,
          workflowIRs: session.workflowIRHistory.length,
          validations: session.validationHistory.length,
          tests: session.testHistory.length,
          deployments: session.deploymentHistory.length,
          monitorings: session.monitoringHistory.length,
          optimizations: session.optimizationHistory.length,
        },

        // The UI renders this rather than inferring "are we waiting?"
        pendingQuestions,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    return handleRouteError(error, "Failed to load session.");
  }
}
