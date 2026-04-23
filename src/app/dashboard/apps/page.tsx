"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Globe,
  BrainCircuit,
  CheckCircle2,
  Database,
  Contact,
  LoaderCircle,
  Mail,
  MessageCircle,
  Hash,
  ClipboardList,
  Table,
  Building2,
  CreditCard,
  Webhook,
  Search,
  Zap,
  ArrowUpRight,
  Cable,
} from "lucide-react";
import { motion } from "framer-motion";
import type { ConnectionStatus } from "@/lib/automation";

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
    icon: Globe,
  },
  whatsapp: {
    title: "WhatsApp",
    description: "Send follow-ups and customer notifications from automations.",
    capability: "Outbound message automation",
    icon: MessageCircle,
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
    icon: Hash,
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
    icon: Building2,
  },
  razorpay: {
    title: "Razorpay",
    description: "React to payments, subscriptions, and order events from Indian payment flows.",
    capability: "Payment event automation",
    icon: CreditCard,
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
    icon: ClipboardList,
  },
  sheets: {
    title: "Sheets",
    description: "Append records to reporting sheets during automation runs.",
    capability: "Structured data storage",
    icon: Table,
  },
  crm: {
    title: "CRM",
    description: "Generic CRM support for lead creation and follow-up flows.",
    capability: "Lead management",
    icon: Contact,
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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return integrations;
    const q = searchQuery.toLowerCase();
    return integrations.filter((entry) => {
      const meta = integrationMeta[entry.integration];
      return (
        entry.integration.toLowerCase().includes(q) ||
        meta?.title.toLowerCase().includes(q) ||
        meta?.description.toLowerCase().includes(q)
      );
    });
  }, [integrations, searchQuery]);

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
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1">
          <Cable className="h-3 w-3 text-accent" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Integrations</span>
        </div>
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-white">
          Connected Apps
        </h1>
        <p className="mt-2 text-white/45">
          Manage the services your automations can use during generation and
          execution.
        </p>
      </div>

      {/* Stats Bar */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 grid grid-cols-3 gap-4"
        >
          {[
            { label: "Connected", value: stats.connected, color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "ring-emerald-400/20" },
            { label: "Available", value: stats.available, color: "text-accent", bg: "bg-accent/10", ring: "ring-accent/20" },
            { label: "Pending", value: stats.pending, color: "text-amber-400", bg: "bg-amber-400/10", ring: "ring-amber-400/20" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset,0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                {stat.label}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className={`text-3xl font-bold tabular-nums ${stat.color}`}>
                  {stat.value}
                </span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${stat.bg} ring-1 ${stat.ring} shadow-[0_2px_8px_rgba(0,0,0,0.2)]`}>
                  <Zap className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Search Bar */}
      {!loading && (
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search integrations..."
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#111113] pl-11 pr-4 text-[14px] text-white outline-none transition-all duration-200 placeholder:text-white/25 focus:border-accent/30 focus:ring-2 focus:ring-accent/10 focus:shadow-[0_0_20px_rgba(59,130,246,0.06)]"
            />
          </div>
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] px-6 py-16 text-center text-white/45">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-accent" />
          <p className="mt-4">Loading integrations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] px-6 py-16 text-center">
          <Cable className="mx-auto h-10 w-10 text-white/15" />
          <p className="mt-4 text-white/40 font-medium">No integrations found</p>
          <p className="mt-1.5 text-sm text-white/25">
            {searchQuery ? "Try a different search term." : "No integrations are available yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry, index) => {
            const meta = integrationMeta[entry.integration] ?? {
              title: entry.integration,
              description: "Connect this service to use it in generated workflows.",
              capability: "Automation integration",
              icon: BrainCircuit,
            };
            const Icon = meta.icon;
            const isConnected = entry.status === "connected";

            return (
              <motion.article
                key={entry.integration}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 transition-all duration-250 hover:-translate-y-1.5 hover:border-white/[0.12] hover:shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset,0_8px_24px_rgba(0,0,0,0.4)]"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/[0.05] text-accent ring-1 ring-accent/15 shadow-[0_4px_12px_rgba(59,130,246,0.08)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        isConnected
                          ? "bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/20"
                          : "bg-white/[0.04] text-white/40 ring-1 ring-white/[0.06]"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-semibold text-white tracking-tight">
                    {meta.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/45">
                    {meta.description}
                  </p>

                  <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-accent/60" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                        Capability
                      </p>
                    </div>
                    <p className="mt-1.5 text-[13px] font-medium text-white/65">
                      {meta.capability}
                    </p>
                    <p className="mt-1.5 text-[11px] text-white/30">
                      {formatUpdatedAt(entry.updatedAt)}
                    </p>
                  </div>

                  <button
                    onClick={() => void handleConnect(entry.integration)}
                    disabled={isConnected || connecting === entry.integration}
                    className={`mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-250 ${
                      isConnected
                        ? "bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/20 shadow-[0_0_16px_rgba(52,211,153,0.06)]"
                        : "bg-gradient-to-r from-accent to-blue-600 text-white hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(59,130,246,0.3)] shadow-[0_2px_10px_rgba(59,130,246,0.15)]"
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
                        <ArrowUpRight className="h-4 w-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
