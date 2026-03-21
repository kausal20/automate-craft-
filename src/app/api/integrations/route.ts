import { supportedIntegrations } from "@/lib/automation";
import { getCurrentUser } from "@/lib/auth";
import { listIntegrationConnectionsForUser } from "@/lib/automation-store";
import { jsonError } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  try {
    const connections = await listIntegrationConnectionsForUser(user.id);
    const connectionMap = new Map(
      connections.map((connection) => [connection.integration, connection]),
    );

    return Response.json({
      integrations: supportedIntegrations.map((integration) => {
        const existing = connectionMap.get(integration);

        return {
          integration,
          status: existing?.status ?? "disconnected",
          updatedAt: existing?.updatedAt ?? null,
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
