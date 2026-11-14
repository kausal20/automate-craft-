/** GET /api/agent/drafts/:id — the caller's own draft only. */
import { getAgentService } from "@/lib/agent/production";
import { withUser } from "@/lib/agent/production/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withUser(async (userId) => {
    const d = await getAgentService().getDraft(userId, id);
    return {
      id: d.id,
      status: d.status,
      language: d.language,
      steps: d.plan ? d.plan.steps.map((s) => s.label) : [],
      costEstimate: d.costEstimate,
      questions: d.questions.map(({ key, question }) => ({ key, question })),
      unsupportedRequests: d.unsupportedRequests,
      reason: d.rejectionReason,
      automationId: d.automationId,
    };
  });
}
