"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  PencilLine,
  Pause,
  Play,
  ScrollText,
  Trash2,
  Zap,
  Plus,
  Copy,
  Check,
  Bot,
  Workflow,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";

type ChatIndexEntry = {
  chatId: string;
  title: string;
  updatedAt: string;
  isStarred: boolean;
};
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { motion, AnimatePresence } from "framer-motion";
import { useCredits } from "@/components/providers/CreditsProvider";

type AutomationSummary = {
  id: string;
  name: string;
  status: "active" | "paused";
  runsCount: number;
  lastRunAt: string | null;
  lastRunStatus: "running" | "success" | "error" | null;
  webhookId: string;
  workflow: {
    integrations: string[];
  };
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}

export default function ProjectsPage() {
  const { refreshCredits } = useCredits();
  const [automations, setAutomations] = useState<AutomationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [recentChats, setRecentChats] = useState<ChatIndexEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("chat_index_v1");
      if (raw) {
        const parsed = JSON.parse(raw) as ChatIndexEntry[];
        if (Array.isArray(parsed)) {
          setRecentChats(parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        }
      }
    } catch {}
  }, []);

  const loadAutomations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/automations", { cache: "no-store" });
      const json = (await response.json()) as {
        automations?: AutomationSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || "Could not load automations.");
      }

      setAutomations(json.automations ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load automations.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAutomations();
  }, []);

  const stats = useMemo(() => {
    const activeCount = automations.filter(
      (automation) => automation.status === "active",
    ).length;
    const totalRuns = automations.reduce(
      (total, automation) => total + automation.runsCount,
      0,
    );
    const lastRun = automations
      .filter((automation) => automation.lastRunAt)
      .sort((left, right) =>
        (right.lastRunAt || "").localeCompare(left.lastRunAt || ""),
      )[0];

    return {
      activeCount,
      totalRuns,
      latestRun: lastRun?.lastRunAt ?? null,
    };
  }, [automations]);

  const filteredAutomations = useMemo(() => {
    return automations.filter((a) => {
      const matchesStatus = statusFilter === "all" ? true : a.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = q ? a.name.toLowerCase().includes(q) : true;
      return matchesStatus && matchesSearch;
    });
  }, [automations, searchQuery, statusFilter]);

  const handleStatusChange = async (
    automationId: string,
    status: "active" | "paused",
  ) => {
    setPendingId(automationId);
    setError(null);

    // Optimistic update
    setAutomations((current) =>
      current.map((a) =>
        a.id === automationId ? { ...a, status } : a,
      ),
    );

    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error || "Could not update automation.");
      }

      // Background re-fetch for full consistency
      void loadAutomations();
    } catch (requestError) {
      // Revert optimistic update on failure
      setAutomations((current) =>
        current.map((a) =>
          a.id === automationId
            ? { ...a, status: status === "active" ? "paused" : "active" }
            : a,
        ),
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update automation.",
      );
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (automationId: string) => {
    setPendingId(automationId);
    setError(null);

    // Optimistic removal
    const previousAutomations = automations;
    setAutomations((current) => current.filter((a) => a.id !== automationId));

    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "DELETE",
      });
      const json = response.status === 204
        ? {}
        : ((await response.json()) as { error?: string });

      if (!response.ok) {
        throw new Error(json.error || "Could not delete automation.");
      }
    } catch (requestError) {
      // Revert on failure
      setAutomations(previousAutomations);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete automation.",
      );
    } finally {
      setPendingId(null);
    }
  };

  const handleRun = async (automationId: string) => {
    setPendingId(automationId);
    setError(null);

    try {
      const response = await fetch("/api/run-automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ automationId }),
      });

      if (response.status === 402) {
        setShowUpgradeModal(true);
        return;
      }

      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error || "Could not run automation.");
      }

      await refreshCredits();
      await loadAutomations();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not run automation.",
      );
    } finally {
      setPendingId(null);
    }
  };

  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCopyWebhook = (webhookId: string) => {
    void navigator.clipboard.writeText(`/api/webhook/${webhookId}`);
    setCopiedWebhook(webhookId);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  const handleDeleteWithConfirm = async (automationId: string) => {
    if (deleteConfirmId !== automationId) {
      setDeleteConfirmId(automationId);
      setTimeout(() => setDeleteConfirmId(null), 3000);
      return;
    }
    setDeleteConfirmId(null);
    await handleDelete(automationId);
  };

  return (
    <div className="relative mx-auto max-w-7xl p-8">
      {/* Subtle background gradient */}
      <div className="pointer-events-none fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05)_0%,transparent_60%)]" />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-white">
            Automations
          </h1>
          <p className="mt-1 text-white/40">
            Review saved workflows, customize setup details, and monitor live
            execution from one place.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-accent to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px]"
        >
          <Plus className="h-4 w-4" />
          New Automation
        </Link>
      </div>

      {/* Search + Filter Bar */}
      {!loading && automations.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search automations..."
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#111113] pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-accent/30 focus:ring-2 focus:ring-accent/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/25" />
            {(["all", "active", "paused"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setStatusFilter(opt)}
                className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.14em] transition-all ${
                  statusFilter === opt
                    ? "bg-gradient-to-r from-accent to-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)]"
                    : "border border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/70"
                }`}
              >
                {opt === "all" ? "All" : opt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10 grid gap-6 md:grid-cols-3">
        {/* Active Automations */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-8 ring-1 ring-white/10 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:ring-white/20">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-blue-500/10 blur-[3rem] transition-all duration-500 group-hover:bg-blue-500/20" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Active Automations
            </span>
            <Activity className="h-5 w-5 text-white/30 transition-colors duration-300 group-hover:text-white" />
          </div>
          <div className="relative z-10 mt-12 flex items-baseline gap-3">
            <span className="font-mono text-[3.5rem] font-medium leading-none tracking-tighter text-white">
              {stats.activeCount}
            </span>
            <span className="mb-1.5 text-sm font-medium text-white/30 truncate">workflows</span>
          </div>
        </div>

        {/* Total Runs */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-8 ring-1 ring-white/10 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:ring-white/20">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-[3rem] transition-all duration-500 group-hover:bg-emerald-500/20" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Total Executions
            </span>
            <Zap className="h-5 w-5 text-white/30 transition-colors duration-300 group-hover:text-white" />
          </div>
          <div className="relative z-10 mt-12 flex items-baseline gap-3">
            <span className="font-mono text-[3.5rem] font-medium leading-none tracking-tighter text-white">
              {stats.totalRuns}
            </span>
            <span className="mb-1.5 text-sm font-medium text-white/30 truncate">tasks</span>
          </div>
        </div>

        {/* Latest Execution */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-8 ring-1 ring-white/10 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:ring-white/20">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-purple-500/10 blur-[3rem] transition-all duration-500 group-hover:bg-purple-500/20" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              Latest Execution
            </span>
            <ScrollText className="h-5 w-5 text-white/30 transition-colors duration-300 group-hover:text-white" />
          </div>
          <div className="relative z-10 mt-12 flex flex-col justify-end min-h-[56px]">
            {stats.latestRun ? (
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[2.25rem] font-medium leading-none tracking-tighter text-white">
                  {new Date(stats.latestRun).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className="text-sm font-medium text-white/40">
                  at {new Date(stats.latestRun).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ) : (
              <span className="font-mono text-[2.25rem] font-medium leading-none tracking-tighter text-white/30">
                Never
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-10 grid gap-6 md:grid-cols-3">
        {/* Last Automation Preview */}
        <div className="md:col-span-2 group relative overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-8 ring-1 ring-white/10 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:ring-white/20">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-accent/10 blur-[3rem] transition-all duration-500 group-hover:bg-accent/20" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-6 relative z-10">Last Automation Draft</h3>
          {recentChats[0] ? (
             <div className="relative z-10 flex items-center justify-between gap-6 rounded-[1.25rem] border border-white/[0.04] bg-gradient-to-br from-[#111] to-[#0a0a0a] p-5 shadow-inner">
               <div className="flex items-center gap-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-accent/[0.08] ring-1 ring-accent/15">
                   <Workflow className="h-5 w-5 text-accent" />
                 </div>
                 <div>
                   <h4 className="text-[15px] font-semibold text-white/90">{recentChats[0].title}</h4>
                   <p className="text-[13px] text-white/40 mt-1">Edited {new Date(recentChats[0].updatedAt).toLocaleDateString()}</p>
                 </div>
               </div>
               <Link href={`/dashboard/chat/${recentChats[0].chatId}`} className="flex h-9 items-center gap-2 rounded-full bg-white/[0.04] px-4 text-[13px] font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors">
                 Resume Build <ArrowRight className="h-3.5 w-3.5" />
               </Link>
             </div>
          ) : (
             <div className="relative z-10 flex h-[84px] items-center justify-center rounded-[1.25rem] border border-dashed border-white/[0.08] bg-white/[0.01]">
               <span className="text-[13px] text-white/30">No recent drafts</span>
             </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-1 group relative overflow-hidden rounded-[2rem] bg-[#0A0A0A] p-8 ring-1 ring-white/10 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:ring-white/20">
          <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-purple-500/10 blur-[3rem] transition-all duration-500 group-hover:bg-purple-500/20" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-6 relative z-10">Recent Activity</h3>
          <div className="space-y-5 relative z-10">
            {recentChats.slice(0, 3).length > 0 ? recentChats.slice(0, 3).map((chat) => (
              <div key={chat.chatId} className="flex items-start gap-3">
                 <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/40 ring-4 ring-accent/10" />
                 <div>
                    <p className="text-[13px] font-medium text-white/70 line-clamp-1">Drafted {chat.title}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{new Date(chat.updatedAt).toLocaleDateString()}</p>
                 </div>
              </div>
            )) : (
              <div className="text-[13px] text-white/30">No activity yet.</div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card-surface rounded-[2rem] p-10 text-center text-foreground/56">
          Loading automations...
        </div>
      ) : error ? (
        <div className="card-surface rounded-[2rem] p-10 text-center text-red-500">
          {error}
        </div>
      ) : automations.length === 0 ? (
        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-[#111113] to-[#0d0d0f] p-14 text-center shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-32 w-64 rounded-full bg-accent/[0.06] blur-[60px]" />
          <div className="relative">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent/[0.04] ring-1 ring-accent/15 shadow-[0_4px_16px_rgba(59,130,246,0.12)]">
              <Bot className="h-7 w-7 text-accent" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              No automations yet
            </h2>
            <p className="mt-3 max-w-sm mx-auto text-white/35">
              Describe what you want to automate in plain English and AI will build it for you.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-accent to-blue-600 px-6 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px]"
            >
              <Plus className="h-4 w-4" />
              Build Your First Automation
            </Link>
          </div>
        </div>
      ) : filteredAutomations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/[0.06] bg-white/[0.02] py-20 text-center">
          <Search className="mx-auto mb-4 h-10 w-10 text-white/15" />
          <p className="text-base font-semibold text-white/50">No automations match</p>
          <p className="mt-2 text-sm text-white/25">Try a different search term or status filter.</p>
          <button
            onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
            className="mt-6 inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 text-sm font-semibold text-white/50 transition-all hover:border-white/[0.14] hover:text-white/80"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredAutomations.map((automation) => (
            <article
              key={automation.id}
              className="card-surface rounded-[2rem] p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-foreground">
                      {automation.name}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        automation.status === "active"
                          ? "border border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400"
                          : "border border-white/[0.06] bg-white/[0.03] text-white/35"
                      }`}
                    >
                      {automation.status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />}
                      {automation.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/35">
                    <span>{automation.runsCount} runs</span>
                    <span>Last run: {formatTimestamp(automation.lastRunAt)}</span>
                    <span>
                      {automation.workflow.integrations.join(", ") || "No integrations"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyWebhook(automation.webhookId)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] font-mono text-white/25 transition-all hover:border-white/[0.1] hover:text-white/50"
                  >
                    {copiedWebhook === automation.webhookId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    /api/webhook/{automation.webhookId}
                  </button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/automations/${automation.id}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition-all hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white hover:translate-y-[-1px]"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit
                  </Link>

                  <button
                    onClick={() => handleRun(automation.id)}
                    disabled={pendingId !== null || automation.status !== "active"}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/[0.06] px-4 text-sm font-semibold text-accent transition-all hover:border-accent/30 hover:bg-accent/[0.1] hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="h-4 w-4" />
                    Run
                  </button>

                  <button
                    onClick={() =>
                      handleStatusChange(
                        automation.id,
                        automation.status === "active" ? "paused" : "active",
                      )
                    }
                    disabled={pendingId !== null}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-white/50 transition-all hover:border-white/[0.14] hover:text-white/80 hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {automation.status === "active" ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Resume
                      </>
                    )}
                  </button>

                  <AnimatePresence mode="wait">
                    <button
                      onClick={() => handleDeleteWithConfirm(automation.id)}
                      disabled={pendingId !== null}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40 ${
                        deleteConfirmId === automation.id
                          ? "border-red-500/30 bg-red-500/10 text-red-400 animate-pulse"
                          : "border-white/[0.06] bg-white/[0.02] text-white/30 hover:border-red-500/20 hover:bg-red-500/[0.06] hover:text-red-400"
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleteConfirmId === automation.id ? "Confirm?" : "Delete"}
                    </button>
                  </AnimatePresence>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
