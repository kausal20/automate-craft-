/**
 * Live ConnectionProvider — bridges the connections domain to the agent.
 *
 * The agent never imports the connections domain directly; this adapter is
 * injected at the composition root. It reports what the store actually says:
 * an integration with no row is simply absent, never assumed connected. The
 * Validator is the authority on whether that blocks deployment.
 */

import { listConnectionsForUser } from "@/lib/connections";
import type { ConnectionProvider } from "./interfaces";
import type { KnownConnection } from "./models/session";

/**
 * The connections domain and the agent share the same four status values, but
 * they are independent types — map explicitly so a change to either surfaces
 * here as a compile error instead of silently mislabelling a credential.
 */
function toKnownStatus(status: string): KnownConnection["status"] {
  switch (status) {
    case "connected":
      return "connected";
    case "expired":
      return "expired";
    case "revoked":
      return "revoked";
    default:
      // "pending" and anything unrecognised are NOT usable credentials.
      return "pending";
  }
}

export const liveConnectionProvider: ConnectionProvider = {
  async list(userId: string): Promise<KnownConnection[]> {
    const connections = await listConnectionsForUser(userId);
    return connections.map((c) => ({
      integration: c.integration,
      status: toKnownStatus(c.status),
    }));
  },
};
