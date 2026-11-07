import { supportedIntegrations, type ConnectionStatus } from "@/lib/automation";
import { daysAgo } from "./time";

const CONNECTED = new Set<string>(["google", "whatsapp", "email", "slack", "forms", "sheets"]);

export type MockConnection = {
  integration: string;
  status: ConnectionStatus;
  updatedAt: string | null;
};

export function seedConnections(): MockConnection[] {
  return supportedIntegrations.map((integration, index) => ({
    integration,
    status: CONNECTED.has(integration) ? "connected" : "disconnected",
    updatedAt: CONNECTED.has(integration) ? daysAgo(index + 3) : null,
  }));
}
