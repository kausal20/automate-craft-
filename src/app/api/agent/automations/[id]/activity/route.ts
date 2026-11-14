/** GET /api/agent/automations/:id/activity — plain-language history. */
import { getAgentService } from "@/lib/agent/production";
import { withUser } from "@/lib/agent/production/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withUser(async (userId) => ({ activity: await getAgentService().activity(userId, id) }));
}
