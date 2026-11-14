/** GET /api/agent/automations/:id */
import { getAgentService } from "@/lib/agent/production";
import { withUser } from "@/lib/agent/production/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withUser((userId) => getAgentService().get(userId, id));
}
