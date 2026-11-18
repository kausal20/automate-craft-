/** POST /api/connectors/mcp/:id/health — re-runs tools/list; updates Connected / Needs reconnect. */
import { getMcpService } from "@/lib/mcp";
import { withSessionUser } from "@/lib/mcp/http";

export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withSessionUser((userId) => getMcpService().health(userId, id));
}
