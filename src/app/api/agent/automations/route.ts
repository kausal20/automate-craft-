/** GET /api/agent/automations — only the caller's automations. */
import { getAgentService } from "@/lib/agent/production";
import { withUser } from "@/lib/agent/production/http";

export async function GET() {
  return withUser(async (userId) => ({ automations: await getAgentService().list(userId) }));
}
