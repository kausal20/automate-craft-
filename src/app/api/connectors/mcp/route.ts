/**
 * GET  /api/connectors/mcp — the caller's own custom connectors (no secrets).
 * POST /api/connectors/mcp { url, auth, displayName?, approvedTools: string[] }
 *      — re-checks the server, then saves. Tools not listed stay OFF.
 */
import { getMcpService } from "@/lib/mcp";
import { body, parseAuth, stringList, withSessionUser } from "@/lib/mcp/http";

export const maxDuration = 60;

export async function GET() {
  return withSessionUser(async (userId) => ({ connectors: await getMcpService().list(userId) }));
}

export async function POST(request: Request) {
  return withSessionUser(async (userId) => {
    const b = await body(request);
    return getMcpService().add(userId, {
      url: String(b.url ?? ""),
      auth: parseAuth(b.auth),
      displayName: typeof b.displayName === "string" ? b.displayName : undefined,
      approvedTools: stringList(b.approvedTools),
    });
  });
}
