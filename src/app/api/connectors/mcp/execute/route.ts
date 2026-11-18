/**
 * POST /api/connectors/mcp/execute { connectorId, tool, token, inputs }
 *
 * Called by an n8n workflow step (not by a browser). The signed token binds
 * user + connector + tool; nothing else can be called with it. Inputs are
 * validated against the tool's saved schema before any call. The tool's
 * result is returned as DATA only.
 */
import { getMcpService, verifyToolCall } from "@/lib/mcp";

export const maxDuration = 60;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.token !== "string") return Response.json({ ok: false, error: "Missing step token." }, { status: 400 });
  const claims = verifyToolCall(b.token, process.env.MCP_EXEC_SECRET ?? "");
  if (!claims || claims.connectorId !== b.connectorId || claims.tool !== b.tool) {
    return Response.json({ ok: false, error: "This step is not allowed to call that tool." }, { status: 403 });
  }
  const out = await getMcpService().callTool(claims.userId, claims.connectorId, claims.tool, b.inputs ?? {}, claims.automationId);
  if (!out.ok) return Response.json({ ok: false, error: out.message }, { status: 422 });
  return Response.json({ ok: true, result: out.result });
}
