"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Loader2, Search, Activity, RefreshCw,
  Clock, Zap, BookOpen, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ── */
type RunLogEntry = {
  at: string;
  level: "info" | "success" | "error";
  message: string;
  stepName?: string;
};

type AutomationRun = {
  id: string;
  automationId: string;
  automationName: string;
  status: "running" | "success" | "error";
  logs: RunLogEntry[];
  triggerSource: "manual" | "webhook";
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
};

type StatusFilter = "all" | AutomationRun["status"];

/* ── Helpers ── */
function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function duration(start: string, end: string | null) {
  if (!end) return "Running...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function statusColor(s: AutomationRun["status"]) {
  if (s === "success") return { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", ring: "ring-emerald-500/20" };
  if (s === "error") return { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", ring: "ring-red-500/20" };
  return { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400 animate-pulse", ring: "ring-amber-500/20" };
}

/* ── Stat Card ── */
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

/* ── Run Row ── */
function RunRow({ run, isExpanded, onToggle }: { run: AutomationRun; isExpanded: boolean; onToggle: () => void }) {
  const sc = statusColor(run.status);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/[0.1]">
      {/* Summary row */}
      <button onClick={onToggle} className="flex w-full items-center gap-4 px-5 py-4 text-left">
        {/* Status dot */}
        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${sc.dot}`} />

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-white/85">{run.automationName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-white/30">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(run.createdAt)}</span>
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{duration(run.createdAt, run.finishedAt)}</span>
            <span className="capitalize">{run.triggerSource}</span>
          </div>
        </div>

        {/* Status badge */}
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
          {run.status === "success" ? "✓ Done" : run.status === "error" ? "✗ Failed" : "● Running"}
        </span>

        {/* Expand chevron */}
        <div className="shrink-0 text-white/20">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Error message inline */}
      {run.errorMessage && !isExpanded && (
        <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{run.errorMessage}</span>
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] px-5 py-5 space-y-5">
              {/* Error (expanded) */}
              {run.errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/15 bg-red-500/[0.05] p-4 text-[13px] text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {run.errorMessage}
                </div>
              )}

              {/* Steps timeline */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/25">What happened — step by step</p>
                <div className="space-y-1">
                  {run.logs.map((entry, i) => (
                    <div key={`${run.id}-${i}`} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
                      <div className="mt-1 shrink-0">
                        {entry.level === "success" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : entry.level === "error" ? (
                          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-white/15" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-white/65">{entry.message}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/20">
                          {entry.stepName && <span className="font-medium text-white/30">{entry.stepName}</span>}
                          <span>{timeAgo(entry.at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payload & Result */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-white/[0.05] bg-black/20 p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/25">Input Data</p>
                  <pre className="overflow-x-auto text-[11px] leading-5 text-white/40 font-mono">{JSON.stringify(run.payload, null, 2)}</pre>
                </div>
                <div className="rounded-xl border border-white/[0.05] bg-black/20 p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/25">Output</p>
                  <pre className="overflow-x-auto text-[11px] leading-5 text-white/40 font-mono">{JSON.stringify(run.result ?? { note: "No output yet" }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════ */
export default function LogsPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/logs", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't load activity.");
      setRuns(json.logs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter(r => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !r.automationName.toLowerCase().includes(q) && !r.logs.some(l => l.message.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [runs, query, filter]);

  const stats = useMemo(() => ({
    total: runs.length,
    done: runs.filter(r => r.status === "success").length,
    failed: runs.filter(r => r.status === "error").length,
    active: runs.filter(r => r.status === "running").length,
  }), [runs]);

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "success", label: "Completed" },
    { id: "error", label: "Failed" },
    { id: "running", label: "Running" },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-white">Activity</h1>
            <p className="mt-1 text-[13px] text-white/40">
              Every time an automation runs, it shows up here.{" "}
              <Link href="/blog/what-are-logs" className="inline-flex items-center gap-1 text-accent/70 hover:text-accent transition-colors">
                <BookOpen className="h-3 w-3" />
                What are logs?
              </Link>
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[12px] font-semibold text-white/50 hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total runs" value={stats.total} color="text-white" />
        <Stat label="Completed" value={stats.done} color="text-emerald-400" />
        <Stat label="Failed" value={stats.failed} color="text-red-400" />
        <Stat label="Active now" value={stats.active} color="text-amber-400" />
      </div>

      {/* ── Search + Filters ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search automations..."
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-4 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-accent/30 focus:ring-2 focus:ring-accent/10 transition-all"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-2 text-[12px] font-semibold transition-all ${
                filter === f.id
                  ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                  : "text-white/35 hover:bg-white/[0.04] hover:text-white/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-accent/50" />
          <p className="mt-4 text-[13px] text-white/30">Loading your activity...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] px-6 py-10 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400/60" />
          <p className="mt-3 text-[14px] text-red-400/80">{error}</p>
          <button onClick={() => void load()} className="mt-4 text-[12px] text-accent hover:underline">Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/[0.06] ring-1 ring-accent/10">
            <Activity className="h-6 w-6 text-accent/40" />
          </div>
          <h2 className="mt-5 text-[16px] font-semibold text-white/70">No activity yet</h2>
          <p className="mt-2 max-w-xs text-center text-[13px] leading-relaxed text-white/30">
            {runs.length === 0
              ? "Once you run an automation, every step will appear here so you can track exactly what happened."
              : "No runs match your current filter."}
          </p>
          {runs.length === 0 && (
            <Link href="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2.5 text-[12px] font-semibold text-accent hover:bg-accent/15 transition-all">
              Create your first automation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((run, i) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <RunRow
                run={run}
                isExpanded={expandedId === run.id}
                onToggle={() => setExpandedId(prev => prev === run.id ? null : run.id)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
