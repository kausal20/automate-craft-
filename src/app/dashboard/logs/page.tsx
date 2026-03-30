"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  LoaderCircle,
  Search,
  Workflow,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";

/* LOGIC EXPLAINED:
This page loads execution history from the backend. The fix adds logs around
the fetch and filter flow so you can tell whether the backend returned logs and
whether the page stored them correctly.
*/

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

const statusFilters: StatusFilter[] = ["all", "success", "error", "running"];

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function formatDuration(start: string, end: string | null) {
  if (!end) {
    return "In progress";
  }

  const duration = new Date(end).getTime() - new Date(start).getTime();

  if (duration < 1000) {
    return `${duration}ms`;
  }

  return `${(duration / 1000).toFixed(1)}s`;
}

function getStatusStyles(status: AutomationRun["status"]) {
  if (status === "success") {
    return "bg-green-50 text-green-700 border-green-100";
  }

  if (status === "error") {
    return "bg-red-50 text-red-600 border-red-100";
  }

  return "bg-amber-50 text-amber-700 border-amber-100";
}

function getLevelStyles(level: RunLogEntry["level"]) {
  if (level === "success") {
    return "bg-green-50 text-green-700";
  }

  if (level === "error") {
    return "bg-red-50 text-red-600";
  }

  return "bg-black/[0.04] text-foreground/64";
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = async () => {
    console.log("[LogsPage] Loading execution logs.");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/logs", { cache: "no-store" });
      const json = (await response.json()) as {
        logs?: AutomationRun[];
        error?: string;
      };
      console.log("[LogsPage] Logs response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not load execution logs.");
      }

      setLogs(json.logs ?? []);
    } catch (requestError) {
      console.error("[LogsPage] Failed to load execution logs.", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load execution logs.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return logs.filter((run) => {
      const matchesStatus =
        statusFilter === "all" ? true : run.status === statusFilter;
      const matchesQuery = normalizedQuery
        ? run.automationName.toLowerCase().includes(normalizedQuery) ||
          run.logs.some((entry) =>
            entry.message.toLowerCase().includes(normalizedQuery),
          )
        : true;

      return matchesStatus && matchesQuery;
    });
  }, [logs, query, statusFilter]);

  const stats = useMemo(() => {
    const successCount = logs.filter((run) => run.status === "success").length;
    const errorCount = logs.filter((run) => run.status === "error").length;
    const runningCount = logs.filter((run) => run.status === "running").length;

    return {
      total: logs.length,
      successCount,
      errorCount,
      runningCount,
    };
  }, [logs]);

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground">
            Execution Logs
          </h1>
          <p className="mt-2 text-foreground/58">
            Review every automation run, inspect step-by-step logs, and spot
            failures quickly.
          </p>
        </div>

        <button
          onClick={() => void loadLogs()}
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
        >
          Refresh logs
        </button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="card-surface rounded-[1.75rem] p-5">
          <p className="text-sm font-medium text-foreground/56">Total runs</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="card-surface rounded-[1.75rem] p-5">
          <p className="text-sm font-medium text-foreground/56">Successful</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {stats.successCount}
          </p>
        </div>
        <div className="card-surface rounded-[1.75rem] p-5">
          <p className="text-sm font-medium text-foreground/56">Failed</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {stats.errorCount}
          </p>
        </div>
        <div className="card-surface rounded-[1.75rem] p-5">
          <p className="text-sm font-medium text-foreground/56">Running now</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {stats.runningCount}
          </p>
        </div>
      </div>

      <div className="card-surface rounded-[2rem] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/36" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by automation name or log message"
              className="w-full rounded-2xl border border-black/8 bg-white px-11 py-3 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((option) => (
              <button
                key={option}
                onClick={() => setStatusFilter(option)}
                className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition-all ${
                  statusFilter === option
                    ? "btn-dark"
                    : "border border-black/8 bg-white text-foreground/68 hover:-translate-y-0.5"
                }`}
              >
                <Filter className="mr-2 h-4 w-4" />
                {option === "all" ? "All" : option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="card-surface rounded-[2rem] px-6 py-14 text-center text-foreground/56">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-accent" />
            <p className="mt-4">Loading execution history...</p>
          </div>
        ) : error ? (
          <div className="card-surface rounded-[2rem] border border-red-100 bg-red-50 px-6 py-10 text-center text-red-600">
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="card-surface rounded-[2rem] px-6 py-14 text-center">
            <Workflow className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 text-2xl font-semibold text-foreground">
              No matching logs yet
            </h2>
            <p className="mt-3 text-foreground/58">
              Run an automation from the dashboard or trigger a webhook to start
              building execution history.
            </p>
          </div>
        ) : (
          filteredLogs.map((run, index) => {
            const isExpanded = expandedId === run.id;

            return (
              <motion.article
                key={run.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="card-surface rounded-[2rem] p-6 transition-all hover:-translate-y-0.5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusStyles(run.status)}`}
                      >
                        {run.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : run.status === "error" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <Clock3 className="h-4 w-4" />
                        )}
                        {run.status}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/40">
                        {run.triggerSource} trigger
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-semibold text-foreground">
                      {run.automationName}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-foreground/58">
                      <span>Started: {formatTimestamp(run.createdAt)}</span>
                      <span>Duration: {formatDuration(run.createdAt, run.finishedAt)}</span>
                      <span>{run.logs.length} log entries</span>
                    </div>

                    {run.errorMessage ? (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        {run.errorMessage}
                      </p>
                    ) : null}
                  </div>

                  <button
                    onClick={() =>
                      setExpandedId((current) => (current === run.id ? null : run.id))
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
                  >
                    {isExpanded ? (
                      <>
                        Hide Details
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        View Details
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="mt-6 grid gap-5 border-t border-black/6 pt-6 lg:grid-cols-[1.25fr_0.75fr]">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-foreground/40">
                        Step Logs
                      </h3>
                      <div className="mt-4 space-y-3">
                        {run.logs.map((entry, entryIndex) => (
                          <div
                            key={`${run.id}-${entryIndex}`}
                            className="rounded-[1.35rem] border border-black/8 bg-black/[0.02] p-4"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getLevelStyles(entry.level)}`}
                              >
                                {entry.level}
                              </span>
                              <span className="text-xs text-foreground/42">
                                {formatTimestamp(entry.at)}
                              </span>
                              {entry.stepName ? (
                                <span className="text-xs font-medium text-foreground/56">
                                  {entry.stepName}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm leading-6 text-foreground/72">
                              {entry.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[1.5rem] border border-black/8 bg-white p-5">
                        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-foreground/40">
                          Trigger Payload
                        </h3>
                        <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/[0.03] p-4 text-xs leading-6 text-foreground/68">
{JSON.stringify(run.payload, null, 2)}
                        </pre>
                      </div>

                      <div className="rounded-[1.5rem] border border-black/8 bg-white p-5">
                        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-foreground/40">
                          Result
                        </h3>
                        <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/[0.03] p-4 text-xs leading-6 text-foreground/68">
{JSON.stringify(run.result ?? { message: "No result payload." }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}
