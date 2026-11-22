import { supportedIntegrations } from "@/lib/automation";
import { getCurrentUser } from "@/lib/auth";
import { listIntegrationConnectionsForUser } from "@/lib/automation-store";
import { listConnectionsForUser } from "@/lib/connections";
import { accountFor } from "@/lib/connections/store";
import { jsonError } from "@/lib/api";

/**
 * GET /api/integrations — the caller's connection status per integration.
 *
 * Real sign-ins (OAuth callback / API-key connect) are stored in the
 * `connections` table, keyed by account (gmail + sheets -> google). The June
 * `connected_integrations` table is still read as a fallback for old rows.
 * Status mapping: connected -> "connected"; expired -> "error" (needs
 * reconnect); revoked / pending / none -> "disconnected".
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  // Open-access guests ("guest-user") have no stored connections and no UUID the
  // database accepts; answer truthfully instead of failing the whole page.
  if (!UUID.test(user.id)) {
    return Response.json({
      integrations: supportedIntegrations.map((integration) => ({ integration, status: "disconnected", updatedAt: null })),
      guest: true,
    });
  }

  try {
    const [legacy, current] = await Promise.all([
      listIntegrationConnectionsForUser(user.id),
      listConnectionsForUser(user.id),
    ]);
    const legacyMap = new Map(legacy.map((c) => [c.integration as string, c]));
    const currentMap = new Map(current.map((c) => [c.integration as string, c]));

    return Response.json({
      integrations: supportedIntegrations.map((integration) => {
        const conn = currentMap.get(accountFor(integration));
        if (conn) {
          const status = conn.status === "connected" ? "connected" : conn.status === "expired" ? "error" : "disconnected";
          return { integration, status, updatedAt: conn.updatedAt ?? null };
        }
        const old = legacyMap.get(integration);
        return {
          integration,
          status: old?.status ?? "disconnected",
          updatedAt: old?.updatedAt ?? null,
        };
      }),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not load integrations.",
      400,
    );
  }
}
