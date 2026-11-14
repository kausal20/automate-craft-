/** POST /api/agent/automations/:id/resume — owner only. */
import { getAgentService } from "@/lib/agent/production";
import { withUser } from "@/lib/agent/production/http";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withUser((userId) => getAgentService().resume(userId, id));
}
