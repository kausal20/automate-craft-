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

/* LOGIC EXPLAINED:
This page reads the automation list and triggers run, pause, resume, and delete
actions. The fix adds logs around every request so you can see which dashboard
button fired, what the API returned, and whether the UI refreshed correctly.
*/

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

export default function DashboardPage() {
  const [automations, setAutomations] = useState<AutomationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadAutomations = async () => {
    console.log("[DashboardPage] Loading automations.");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/automations", { cache: "no-store" });
      const json = (await response.json()) as {
        automations?: AutomationSummary[];
        error?: string;
      };
      console.log("[DashboardPage] Automations response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not load automations.");
      }

      setAutomations(json.automations ?? []);
      console.log("[DashboardPage] Automations stored in state.");
    } catch (requestError) {
      console.error("[DashboardPage] Failed to load automations.", requestError);
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
    console.log("[DashboardPage] Updating status.", { automationId, status });
    setPendingId(automationId);
    setError(null);

    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const json = (await response.json()) as { error?: string };
      console.log("[DashboardPage] Status response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not update automation.");
      }

      await loadAutomations();
    } catch (requestError) {
      console.error("[DashboardPage] Failed to update status.", requestError);
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
    console.log("[DashboardPage] Deleting automation.", automationId);
    setPendingId(automationId);
    setError(null);

    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "DELETE",
      });
      const json = response.status === 204
        ? {}
        : ((await response.json()) as { error?: string });
      console.log("[DashboardPage] Delete response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not delete automation.");
      }

      await loadAutomations();
    } catch (requestError) {
      console.error("[DashboardPage] Failed to delete automation.", requestError);
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
    console.log("[DashboardPage] Running automation.", automationId);
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
      const json = (await response.json()) as { error?: string };
      console.log("[DashboardPage] Run response received.", json);

      if (!response.ok) {
        throw new Error(json.error || "Could not run automation.");
      }

      await loadAutomations();
    } catch (requestError) {
      console.error("[DashboardPage] Failed to run automation.", requestError);
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

        <div className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-medium text-foreground/62">
          Create new automations from the homepage prompt.
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="card-surface rounded-[1.75rem] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Activity className="h-5 w-5" />
          </div>
          <p className="mt-5 text-sm font-medium text-foreground/56">
            Active automations
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {stats.activeCount}
          </p>
        </div>

        <div className="card-surface rounded-[1.75rem] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Zap className="h-5 w-5" />
          </div>
          <p className="mt-5 text-sm font-medium text-foreground/56">
            Total runs
          </p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {stats.totalRuns}
          </p>
        </div>

        <div className="card-surface rounded-[1.75rem] p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ScrollText className="h-5 w-5" />
          </div>
          <p className="mt-5 text-sm font-medium text-foreground/56">
            Latest execution
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {formatTimestamp(stats.latestRun)}
          </p>
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
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-white"
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
                    disabled={pendingId === automation.id || automation.status !== "active"}
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
                    disabled={pendingId === automation.id}
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

                  <Link
                    href="/dashboard/logs"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
                  >
                    <ScrollText className="h-4 w-4" />
                    View Logs
                  </Link>

                  <button
                    onClick={() => handleDelete(automation.id)}
                    disabled={pendingId === automation.id}
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
    </div>
  );
}
