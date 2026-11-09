import { createSupabaseAdminClient } from "@/lib/supabase";
import {
  evaluateAutomationHealth,
  type HealthRun,
  type HealthVerdict,
} from "./health";

const RUNS_PER_AUTOMATION = 10;
const PAGE_SIZE = 200;

export interface CheckSummary {
  checked: number;
  ok: number;
  warn: number;
  broken: number;
  newAlerts: number;
  resolvedAlerts: number;
}

type AutomationRow = {
  id: string;
  user_id: string;
  status: "active" | "paused";
  created_at: string;
  integration_status: Record<string, "connected" | "disconnected"> | null;
};

/**
 * Checks every active automation, stores the verdict, and opens/resolves
 * alert rows. Alert rows are deduped: one open alert per (automation, reason).
 * Slice 1 only records alerts; sending (WhatsApp) is added later.
 */
export async function runWatchdogChecks(now = Date.now()): Promise<CheckSummary> {
  const db = createSupabaseAdminClient();
  const summary: CheckSummary = { checked: 0, ok: 0, warn: 0, broken: 0, newAlerts: 0, resolvedAlerts: 0 };

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("automations")
      .select("id,user_id,status,created_at,integration_status")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`watchdog: could not list automations: ${error.message}`);
    const rows = (data ?? []) as AutomationRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      const { data: runData } = await db
        .from("automation_runs")
        .select("status,created_at")
        .eq("automation_id", row.id)
        .order("created_at", { ascending: false })
        .limit(RUNS_PER_AUTOMATION);

      const recentRuns: HealthRun[] = (runData ?? []).map((r) => ({
        status: r.status as HealthRun["status"],
        createdAt: r.created_at as string,
      }));

      const verdict = evaluateAutomationHealth({
        automationId: row.id,
        automationStatus: row.status,
        automationCreatedAt: row.created_at,
        integrationStatus: row.integration_status ?? {},
        recentRuns,
        now,
      });

      await recordVerdict(db, row, verdict, now, summary);
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return summary;
}

async function recordVerdict(
  db: ReturnType<typeof createSupabaseAdminClient>,
  row: AutomationRow,
  verdict: HealthVerdict,
  now: number,
  summary: CheckSummary,
) {
  summary.checked += 1;
  summary[verdict.status] += 1;
  const nowIso = new Date(now).toISOString();

  await db.from("watchdog_checks").insert({
    automation_id: row.id,
    user_id: row.user_id,
    status: verdict.status,
    reason_code: verdict.reason,
    detail: verdict.detail,
    checked_at: nowIso,
  });

  const { data: open } = await db
    .from("watchdog_alerts")
    .select("id,reason_code")
    .eq("automation_id", row.id)
    .is("resolved_at", null);
  const openAlerts = open ?? [];

  // Resolve alerts whose reason no longer applies.
  for (const alert of openAlerts) {
    if (alert.reason_code !== verdict.reason) {
      await db.from("watchdog_alerts").update({ resolved_at: nowIso }).eq("id", alert.id);
      summary.resolvedAlerts += 1;
    }
  }

  // Open a new alert only if this reason is not already open.
  if (verdict.reason && !openAlerts.some((a) => a.reason_code === verdict.reason)) {
    const { error } = await db.from("watchdog_alerts").insert({
      automation_id: row.id,
      user_id: row.user_id,
      reason_code: verdict.reason,
      first_sent_at: nowIso,
      last_sent_at: nowIso,
    });
    // Unique index violation = another run opened it first; that is fine.
    if (!error) summary.newAlerts += 1;
  }
}
