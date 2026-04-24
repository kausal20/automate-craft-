"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Loader2, Search, ArrowUpRight, Cable, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConnectionStatus } from "@/lib/automation";

/* ── Types ── */
type IntegrationEntry = {
  integration: string;
  status: ConnectionStatus;
  updatedAt: string | null;
};

type FilterTab = "all" | "connected" | "available";

/* ── Brand SVG Logos (inline, tiny) ── */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.35 2.56 10.51l7.97-5.92z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.92C6.51 42.62 14.62 48 24 48z"/></svg>
  );
}
function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><path fill="#25D366" d="M24 0C10.745 0 0 10.745 0 24c0 4.246 1.106 8.234 3.042 11.702L1.05 47.1l11.74-1.968A23.883 23.883 0 0 0 24 48c13.255 0 24-10.745 24-24S37.255 0 24 0z"/><path fill="#fff" d="M35.176 28.942c-.463-.232-2.742-1.352-3.166-1.507-.425-.154-.734-.232-1.043.232-.31.463-1.197 1.507-1.467 1.816-.271.31-.54.348-1.004.116-.463-.232-1.957-.72-3.727-2.298-1.378-1.229-2.308-2.746-2.579-3.209-.271-.463-.029-.714.203-.944.208-.208.463-.54.694-.81.232-.271.31-.463.463-.772.155-.31.078-.58-.038-.81-.116-.232-1.043-2.514-1.429-3.44-.376-.906-.76-.783-1.043-.798l-.888-.015c-.31 0-.81.116-1.234.58-.425.462-1.62 1.583-1.62 3.862 0 2.278 1.66 4.48 1.892 4.789.232.31 3.266 4.987 7.913 6.993 1.106.478 1.969.763 2.641.977 1.11.352 2.12.302 2.919.183.89-.133 2.742-1.12 3.128-2.202.387-1.082.387-2.01.271-2.202-.116-.193-.425-.31-.888-.54z"/></svg>
  );
}
function SlackLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><path fill="#E01E5A" d="M10.08 30.24a5.04 5.04 0 1 1-5.04-5.04h5.04v5.04zM12.6 30.24a5.04 5.04 0 0 1 10.08 0v12.6a5.04 5.04 0 1 1-10.08 0v-12.6z"/><path fill="#36C5F0" d="M17.64 10.08a5.04 5.04 0 1 1 5.04-5.04v5.04h-5.04zM17.64 12.6a5.04 5.04 0 0 1 0 10.08H5.04a5.04 5.04 0 0 1 0-10.08h12.6z"/><path fill="#2EB67D" d="M37.8 17.64a5.04 5.04 0 1 1 5.04 5.04H37.8v-5.04zM35.28 17.64a5.04 5.04 0 0 1-10.08 0V5.04a5.04 5.04 0 1 1 10.08 0v12.6z"/><path fill="#ECB22E" d="M30.24 37.8a5.04 5.04 0 1 1-5.04 5.04V37.8h5.04zM30.24 35.28a5.04 5.04 0 0 1 0-10.08h12.6a5.04 5.04 0 1 1 0 10.08h-12.6z"/></svg>
  );
}
function HubSpotLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><path fill="#FF7A59" d="M35.5 17.88V12.5a3.62 3.62 0 0 0 2.1-3.26 3.63 3.63 0 0 0-7.26 0c0 1.41.82 2.62 2 3.2v5.44a10.34 10.34 0 0 0-4.62 2.5l-12.2-9.5a4.15 4.15 0 0 0 .12-1A4.16 4.16 0 1 0 11.5 14a4.1 4.1 0 0 0 2.34-.74l12 9.33a10.42 10.42 0 0 0 .2 11.76l-3.7 3.7a3.3 3.3 0 0 0-1-.16 3.38 3.38 0 1 0 3.38 3.38 3.3 3.3 0 0 0-.2-1.12l3.62-3.62a10.44 10.44 0 1 0 7.36-18.65z"/></svg>
  );
}
function SalesforceLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><path fill="#00A1E0" d="M20 8.2c1.94-2.02 4.65-3.28 7.64-3.28 3.82 0 7.14 2.03 8.99 5.07a12.3 12.3 0 0 1 5.07-1.1c6.82 0 12.35 5.53 12.35 12.35 0 6.82-5.53 12.35-12.35 12.35-.96 0-1.9-.11-2.8-.32a9.9 9.9 0 0 1-8.5 4.87c-1.55 0-3.03-.36-4.34-1a11.42 11.42 0 0 1-9.62 5.27c-5.09 0-9.43-3.33-10.93-7.93A10.29 10.29 0 0 1 0 24.57c0-5.7 4.62-10.32 10.32-10.32 1.54 0 3 .34 4.31.94A11.28 11.28 0 0 1 20 8.2z"/></svg>
  );
}
function RazorpayLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><rect fill="#2B84EA" width="48" height="48" rx="10"/><path fill="#fff" d="M19.2 12l-7.2 24h5.4l1.8-6h7.2l-1.2 3.6h5.4L33.6 12H19.2zm2.4 13.2L24 16.8h.6l-1.2 8.4h-1.8z"/></svg>
  );
}
function WebhookLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#1a1a2e" stroke="#3b82f6" strokeWidth="2"/><path fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" d="M14 30a8 8 0 0 1 14-5.3M24 20a8 8 0 0 1 11.5 9M30 34H18"/><circle fill="#3b82f6" cx="14" cy="30" r="2.5"/><circle fill="#3b82f6" cx="34" cy="30" r="2.5"/><circle fill="#3b82f6" cx="24" cy="16" r="2.5"/></svg>
  );
}
function MailLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><rect fill="#EA4335" width="48" height="48" rx="8"/><path fill="#fff" d="M10 14l14 10 14-10v20H10z" opacity=".3"/><path fill="#fff" d="M10 14h28L24 28z"/></svg>
  );
}
function SheetsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><path fill="#0F9D58" d="M30 4H12a4 4 0 0 0-4 4v32a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V14L30 4z"/><path fill="#fff" d="M14 22h20v16H14z"/><path fill="#0F9D58" d="M14 22h8v4h-8zm0 6h8v4h-8zm10-6h10v4H24zm0 6h10v4H24zm-10 6h8v4h-8zm10 0h10v4H24z"/><path fill="#87CEAB" d="M30 4v10h10z"/></svg>
  );
}
function FormsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><rect fill="#7248B9" width="48" height="48" rx="8"/><rect fill="#fff" x="12" y="12" width="24" height="24" rx="3"/><circle fill="#7248B9" cx="18" cy="20" r="2"/><rect fill="#7248B9" x="23" y="19" width="13" height="2.5" rx="1"/><circle fill="#7248B9" cx="18" cy="28" r="2"/><rect fill="#7248B9" x="23" y="27" width="13" height="2.5" rx="1"/></svg>
  );
}
function CRMLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48"><rect fill="#FF6B35" width="48" height="48" rx="10"/><circle fill="#fff" cx="24" cy="18" r="6"/><path fill="#fff" d="M12 38c0-6.627 5.373-12 12-12s12 5.373 12 12z" opacity=".7"/></svg>
  );
}

/* ── Integration metadata ── */
const integrationMeta: Record<string, {
  title: string;
  description: string;
  category: string;
  logo: React.FC<{ className?: string }>;
  bgColor: string;
}> = {
  google: {
    title: "Google",
    description: "Sheets, Gmail, Drive, Calendar — all Google Workspace apps.",
    category: "Productivity",
    logo: GoogleLogo,
    bgColor: "bg-white",
  },
  whatsapp: {
    title: "WhatsApp",
    description: "Send automated messages, alerts, and follow-ups to customers.",
    category: "Messaging",
    logo: WhatsAppLogo,
    bgColor: "bg-[#25D366]/10",
  },
  email: {
    title: "Email (SMTP)",
    description: "Send transactional emails as part of your automation workflows.",
    category: "Communication",
    logo: MailLogo,
    bgColor: "bg-red-500/10",
  },
  slack: {
    title: "Slack",
    description: "Post alerts and updates to your team's Slack channels.",
    category: "Communication",
    logo: SlackLogo,
    bgColor: "bg-white",
  },
  hubspot: {
    title: "HubSpot",
    description: "Sync contacts, create deals, and manage your CRM pipeline.",
    category: "CRM",
    logo: HubSpotLogo,
    bgColor: "bg-[#FF7A59]/10",
  },
  salesforce: {
    title: "Salesforce",
    description: "Enterprise-grade CRM actions triggered by your automations.",
    category: "CRM",
    logo: SalesforceLogo,
    bgColor: "bg-[#00A1E0]/10",
  },
  razorpay: {
    title: "Razorpay",
    description: "React to payments, refunds, and subscription events.",
    category: "Payments",
    logo: RazorpayLogo,
    bgColor: "bg-[#2B84EA]/10",
  },
  webhook: {
    title: "Webhook",
    description: "Send or receive HTTP events to any external API or service.",
    category: "Developer",
    logo: WebhookLogo,
    bgColor: "bg-accent/10",
  },
  forms: {
    title: "Forms",
    description: "Use form submissions as triggers for your automation flows.",
    category: "Input",
    logo: FormsLogo,
    bgColor: "bg-purple-500/10",
  },
  sheets: {
    title: "Google Sheets",
    description: "Log data, append rows, and read spreadsheets during workflow runs.",
    category: "Productivity",
    logo: SheetsLogo,
    bgColor: "bg-emerald-500/10",
  },
  crm: {
    title: "CRM (Generic)",
    description: "Connect any CRM for lead management and follow-up workflows.",
    category: "CRM",
    logo: CRMLogo,
    bgColor: "bg-orange-500/10",
  },
};

const defaultMeta = {
  title: "Unknown",
  description: "Connect this service to use it in your automations.",
  category: "Other",
  logo: Cable as React.FC<{ className?: string }>,
  bgColor: "bg-white/5",
};

/* ── Helpers ── */
function timeAgo(d: string | null) {
  if (!d) return "Not connected";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ── App Card ── */
function AppCard({
  entry,
  connecting,
  onConnect,
  index,
}: {
  entry: IntegrationEntry;
  connecting: string | null;
  onConnect: (id: string) => void;
  index: number;
}) {
  const meta = integrationMeta[entry.integration] ?? defaultMeta;
  const Logo = meta.logo;
  const connected = entry.status === "connected";
  const isConnecting = connecting === entry.integration;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="group relative rounded-2xl border border-white/[0.06] bg-[#0f0f11] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#111114]"
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.bgColor} p-2`}>
          <Logo className="h-full w-full" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-white/90 truncate">{meta.title}</h3>
            <span className="shrink-0 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-white/25">{meta.category}</span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-white/35 line-clamp-2">{meta.description}</p>
        </div>
      </div>

      {/* Footer: status + action */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              Connected
            </span>
          )}
          <span className="text-[11px] text-white/20">{timeAgo(entry.updatedAt)}</span>
        </div>

        <button
          onClick={() => onConnect(entry.integration)}
          disabled={connected || isConnecting}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
            connected
              ? "bg-emerald-500/[0.06] text-emerald-400/60 cursor-default"
              : isConnecting
              ? "bg-white/[0.04] text-white/30"
              : "bg-accent/10 text-accent hover:bg-accent/15 active:scale-[0.97]"
          }`}
        >
          {isConnecting ? (
            <><Loader2 className="h-3 w-3 animate-spin" />Connecting...</>
          ) : connected ? (
            <><CheckCircle2 className="h-3 w-3" />Active</>
          ) : (
            <><Plus className="h-3 w-3" />Connect</>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════ */
export default function ConnectedAppsPage() {
  const [integrations, setIntegrations] = useState<IntegrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't load apps.");
      setIntegrations(json.integrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load apps.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleConnect = async (id: string) => {
    setConnecting(id);
    setError(null);
    try {
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't connect.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect.");
    } finally {
      setConnecting(null);
    }
  };

  const connectedCount = integrations.filter(e => e.status === "connected").length;

  const filtered = useMemo(() => {
    let list = integrations;
    if (tab === "connected") list = list.filter(e => e.status === "connected");
    if (tab === "available") list = list.filter(e => e.status !== "connected");
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(e => {
        const m = integrationMeta[e.integration];
        return e.integration.includes(q) || m?.title.toLowerCase().includes(q) || m?.category.toLowerCase().includes(q);
      });
    }
    return list;
  }, [integrations, query, tab]);

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "all", label: "All apps", count: integrations.length },
    { id: "connected", label: "Connected", count: connectedCount },
    { id: "available", label: "Available", count: integrations.length - connectedCount },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-tight text-white">Connect Apps</h1>
        <p className="mt-1 text-[13px] text-white/40">
          Link the tools your automations need. Connected apps can be used as triggers and actions in your workflows.
        </p>
      </div>

      {/* ── Search + Tabs ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search apps..."
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-4 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-accent/30 focus:ring-2 focus:ring-accent/10 transition-all"
          />
        </div>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all ${
                tab === t.id
                  ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                  : "text-white/35 hover:bg-white/[0.04] hover:text-white/60"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === t.id ? "bg-accent/15 text-accent" : "bg-white/[0.05] text-white/25"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 rounded-xl border border-red-500/15 bg-red-500/[0.05] px-4 py-3 text-[13px] text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-accent/50" />
          <p className="mt-4 text-[13px] text-white/30">Loading apps...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/[0.06] ring-1 ring-accent/10">
            <Cable className="h-6 w-6 text-accent/40" />
          </div>
          <h2 className="mt-5 text-[16px] font-semibold text-white/70">No apps found</h2>
          <p className="mt-2 text-[13px] text-white/30">
            {query ? "Try a different search term." : "No integrations are available yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry, i) => (
            <AppCard
              key={entry.integration}
              entry={entry}
              connecting={connecting}
              onConnect={handleConnect}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
