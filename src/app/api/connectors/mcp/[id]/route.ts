/**
 * PATCH  /api/connectors/mcp/:id { approvedTools?, displayName?, auth? }
 *        — switch tools on/off, rename, or reconnect with a new key (same row).
 * DELETE /api/connectors/mcp/:id — removes it, pauses automations that use it.
 */
import { getMcpService } from "@/lib/mcp";
import { body, parseAuth, stringList, withSessionUser } from "@/lib/mcp/http";

export const maxDuration = 60;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withSessionUser(async (userId) => {
    const b = await body(request);
    const svc = getMcpService();
    let view;
    if (b.auth !== undefined) view = await svc.reconnect(userId, id, parseAuth(b.auth));
    if (typeof b.displayName === "string") view = await svc.rename(userId, id, b.displayName);
    if (b.approvedTools !== undefined) view = await svc.setApproved(userId, id, stringList(b.approvedTools));
    return view ?? (await svc.list(userId)).find((c) => c.id === id) ?? null;
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withSessionUser((userId) => getMcpService().remove(userId, id));
}
