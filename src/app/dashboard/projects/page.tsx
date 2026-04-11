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
} from "lucide-react";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";

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
  const [automations, setAutomations] = useState<AutomationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
    const confirmed = window.confirm(
      "Are you sure you want to delete this automation? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

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

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground">
            Automations
          </h1>
          <p className="mt-1 text-foreground/58">
            Review saved workflows, customize setup details, and monitor live
            execution from one place.
          </p>
        </div>
      </div>

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

      {loading ? (
        <div className="card-surface rounded-[2rem] p-10 text-center text-foreground/56">
          Loading automations...
        </div>
      ) : error ? (
        <div className="card-surface rounded-[2rem] p-10 text-center text-red-500">
          {error}
        </div>
      ) : automations.length === 0 ? (
        <div className="card-surface rounded-[2rem] p-10 text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            No automations yet
          </h2>
          <p className="mt-3 text-foreground/58">
            Start from the homepage prompt to generate your first automation.
          </p>
          <Link
            href="/"
            className="btn-dark mt-6 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold"
          >
            Open Homepage
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {automations.map((automation) => (
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                        automation.status === "active"
                          ? "bg-green-50 text-green-700"
                          : "bg-black/[0.05] text-foreground/56"
                      }`}
                    >
                      {automation.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-foreground/58">
                    <span>{automation.runsCount} runs</span>
                    <span>Last run: {formatTimestamp(automation.lastRunAt)}</span>
                    <span>
                      Integrations: {automation.workflow.integrations.join(", ") || "None"}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-foreground/42">
                    Webhook: /api/webhook/{automation.webhookId}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/automations/${automation.id}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
                  >
                    <PencilLine className="h-4 w-4" />
                    Customize
                  </Link>

                  <button
                    onClick={() => handleRun(automation.id)}
                    disabled={pendingId !== null || automation.status !== "active"}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
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

                  <button
                    onClick={() => handleDelete(automation.id)}
                    disabled={pendingId !== null}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-5 text-sm font-semibold text-red-600 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
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
