"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Bot,
  CheckCircle2,
  Database,
  Link2,
  LoaderCircle,
  Mail,
  MessageCircleMore,
  PlugZap,
  Rows3,
  ShieldCheck,
  WalletCards,
  Webhook,
} from "lucide-react";
import type { ConnectionStatus } from "@/lib/automation";

/* LOGIC EXPLAINED:
This page loads saved app connections and lets the user connect one. The new
logs make it easy to see whether the page loaded data correctly and whether the
connect button actually saved the new connection state.
*/

type IntegrationEntry = {
  integration: string;
  status: ConnectionStatus;
  updatedAt: string | null;
};

const integrationMeta: Record<
  string,
  {
    title: string;
    description: string;
    capability: string;
    icon: LucideIcon;
  }
> = {
  google: {
    title: "Google",
    description: "Use Google apps to store, route, and notify across workflows.",
    capability: "Sheets, forms, and workspace actions",
    icon: AppWindow,
  },
  whatsapp: {
    title: "WhatsApp",
    description: "Send follow-ups and customer notifications from automations.",
    capability: "Outbound message automation",
    icon: MessageCircleMore,
  },
  email: {
    title: "Email",
    description: "Send templated email responses as part of workflow execution.",
    capability: "Transactional notifications",
    icon: Mail,
  },
  slack: {
    title: "Slack",
    description: "Push team notifications when important events happen.",
    capability: "Internal alert routing",
    icon: PlugZap,
  },
  hubspot: {
    title: "HubSpot",
    description: "Sync contacts and update pipeline records automatically.",
    capability: "CRM enrichment",
    icon: Database,
  },
  salesforce: {
    title: "Salesforce",
    description: "Trigger enterprise CRM actions from AI-generated workflows.",
    capability: "Enterprise CRM sync",
    icon: ShieldCheck,
  },
  stripe: {
    title: "Stripe",
    description: "React to payments, customers, and subscription events.",
    capability: "Billing event automation",
    icon: WalletCards,
  },
  webhook: {
    title: "Webhook",
    description: "Forward events to external APIs and custom services.",
    capability: "Outbound HTTP delivery",
    icon: Webhook,
  },
  forms: {
    title: "Forms",
    description: "Use form submissions as a structured trigger source.",
    capability: "Lead capture intake",
    icon: Rows3,
  },
  sheets: {
    title: "Sheets",
    description: "Append records to reporting sheets during automation runs.",
    capability: "Structured data storage",
    icon: Rows3,
  },
  crm: {
    title: "CRM",
    description: "Generic CRM support for lead creation and follow-up flows.",
    capability: "Lead management",
    icon: Link2,
  },
};

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "Not connected yet";
  }

  return `Updated ${new Date(value).toLocaleString()}`;
}

export default function ConnectedAppsPage() {
  const [integrations, setIntegrations] = useState<IntegrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const loadIntegrations = async () => {
    console.log("[ConnectedAppsPage] Loading integrations.");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/integrations", { cache: "no-store" });
      const json = (await response.json()) as {
        integrations?: IntegrationEntry[];
        error?: string;
      };
      console.log("[ConnectedAppsPage] Integrations response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not load integrations.");
      }

      setIntegrations(json.integrations ?? []);
    } catch (requestError) {
      console.error("[ConnectedAppsPage] Failed to load integrations.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load integrations.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadIntegrations();
  }, []);

  const stats = useMemo(() => {
    const connected = integrations.filter(
      (entry) => entry.status === "connected",
    ).length;

    return {
      connected,
      available: integrations.length,
      pending: Math.max(integrations.length - connected, 0),
    };
  }, [integrations]);

  const handleConnect = async (integration: string) => {
    console.log("[ConnectedAppsPage] Connecting integration.", integration);
    setConnecting(integration);
    setError(null);

    try {
      const response = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ integration }),
      });

      const json = (await response.json()) as {
        error?: string;
      };
      console.log("[ConnectedAppsPage] Connect response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not connect integration.");
      }

      await loadIntegrations();
    } catch (requestError) {
      console.error("[ConnectedAppsPage] Failed to connect integration.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not connect integration.",
      );
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground">
            Connected Apps
          </h1>
          <p className="mt-2 text-foreground/58">
            Manage the services your automations can use during generation and
            execution.
          </p>
        </div>

        <div className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-medium text-foreground/62">
          Connection states are saved per user for activation checks.
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="card-surface rounded-[1.75rem] p-5">
          <p className="text-sm font-medium text-foreground/56">Connected</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.connected}</p>
        </div>
        <div className="card-surface rounded-[1.75rem] p-5">
          <p className="text-sm font-medium text-foreground/56">Available</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.available}</p>
        </div>
        <div className="card-surface rounded-[1.75rem] p-5">
          <p className="text-sm font-medium text-foreground/56">Still to connect</p>
          <p className="mt-2 text-3xl font-bold text-accent">{stats.pending}</p>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card-surface rounded-[2rem] px-6 py-16 text-center text-foreground/56">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-accent" />
          <p className="mt-4">Loading integrations...</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((entry) => {
            const meta = integrationMeta[entry.integration] ?? {
              title: entry.integration,
              description: "Connect this service to use it in generated workflows.",
              capability: "Automation integration",
              icon: Bot,
            };
            const Icon = meta.icon;
            const isConnected = entry.status === "connected";

            return (
              <article
                key={entry.integration}
                className="card-surface rounded-[2rem] p-6 transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      isConnected
                        ? "bg-green-50 text-green-700"
                        : "bg-black/[0.05] text-foreground/52"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>

                <h2 className="mt-5 text-xl font-semibold text-foreground">
                  {meta.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-foreground/60">
                  {meta.description}
                </p>

                <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-black/[0.02] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/40">
                    Capability
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground/72">
                    {meta.capability}
                  </p>
                  <p className="mt-2 text-xs text-foreground/46">
                    {formatUpdatedAt(entry.updatedAt)}
                  </p>
                </div>

                <button
                  onClick={() => void handleConnect(entry.integration)}
                  disabled={isConnected || connecting === entry.integration}
                  className={`mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all ${
                    isConnected
                      ? "bg-green-50 text-green-700"
                      : "bg-foreground text-white hover:-translate-y-0.5 hover:bg-black/85"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {connecting === entry.integration ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : isConnected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Connected
                    </>
                  ) : (
                    <>
                      <PlugZap className="h-4 w-4" />
                      Connect
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
