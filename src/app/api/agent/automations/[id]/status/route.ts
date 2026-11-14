/** GET /api/agent/automations/:id/status — synced from n8n. */
import { getAgentService } from "@/lib/agent/production";
import { withUser } from "@/lib/agent/production/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withUser((userId) => getAgentService().status(userId, id));
}
