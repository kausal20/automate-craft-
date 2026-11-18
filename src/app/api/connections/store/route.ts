/**
 * GET /api/connections/store[?check=1] — the Connected Apps page model for the
 * caller: one card per account (with the apps it covers), its state, and the
 * caller's own custom connectors. ?check=1 runs a live health check.
 */
import { getCurrentUser } from "@/lib/auth";
import { listConnectedApps } from "@/lib/connections/connected-apps";
import { liveHealthDeps } from "@/lib/connections/health-live";
import { listConnectionsForUser } from "@/lib/connections";
import { getMcpService } from "@/lib/mcp";

export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  const check = new URL(request.url).searchParams.get("check") === "1";
  try {
    const view = await listConnectedApps(
      { listConnections: listConnectionsForUser, health: liveHealthDeps, listCustom: (userId) => getMcpService().list(userId) },
      user.id,
      { check },
    );
    return Response.json(view);
  } catch {
    return Response.json({ error: "We couldn't load your connected apps right now." }, { status: 500 });
  }
}
