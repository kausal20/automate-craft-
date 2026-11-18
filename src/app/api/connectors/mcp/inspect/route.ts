/** POST /api/connectors/mcp/inspect { url, auth } — handshake + tool list. Saves NOTHING. */
import { getMcpService } from "@/lib/mcp";
import { body, parseAuth, withSessionUser } from "@/lib/mcp/http";

export const maxDuration = 60;

export async function POST(request: Request) {
  return withSessionUser(async () => {
    const b = await body(request);
    return getMcpService().inspect({ url: String(b.url ?? ""), auth: parseAuth(b.auth) });
  });
}
