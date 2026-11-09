import { createSupabaseAdminClient } from "@/lib/supabase";
import { isSupabaseMode } from "@/lib/env";
import type { ReasonCode } from "./health";
import { describeAlert, type AlertText } from "./messages";

export interface OpenAlert {
  id: string;
  automationId: string;
  reason: ReasonCode;
  since: string;
  text: { en: AlertText; hi: AlertText };
}

/** Open (unresolved) watchdog alerts for one user, with plain-words text in both languages. */
export async function listOpenAlertsForUser(userId: string): Promise<OpenAlert[]> {
  if (!isSupabaseMode()) return [];
  const db = createSupabaseAdminClient();

  const { data: alerts, error } = await db
    .from("watchdog_alerts")
    .select("id,automation_id,reason_code,first_sent_at")
    .eq("user_id", userId)
    .is("resolved_at", null)
    .order("first_sent_at", { ascending: false })
    .limit(20);
  if (error || !alerts?.length) return [];

  const ids = [...new Set(alerts.map((a) => a.automation_id as string))];
  const { data: autos } = await db
    .from("automations")
    .select("id,name")
    .eq("user_id", userId)
    .in("id", ids);
  const names = new Map((autos ?? []).map((a) => [a.id as string, a.name as string]));

  // Latest check detail per automation (which apps are disconnected, etc.).
  const { data: checks } = await db
    .from("watchdog_checks")
    .select("automation_id,detail,checked_at")
    .eq("user_id", userId)
    .in("automation_id", ids)
    .order("checked_at", { ascending: false })
    .limit(ids.length * 3);
  const detailBy = new Map<string, Record<string, unknown>>();
  for (const c of checks ?? []) {
    const key = c.automation_id as string;
    if (!detailBy.has(key)) detailBy.set(key, (c.detail ?? {}) as Record<string, unknown>);
  }

  return alerts
    .filter((a) => names.has(a.automation_id as string))
    .map((a) => {
      const base = {
        reason: a.reason_code as ReasonCode,
        automationId: a.automation_id as string,
        automationName: names.get(a.automation_id as string) ?? "",
        detail: detailBy.get(a.automation_id as string),
      };
      return {
        id: a.id as string,
        automationId: base.automationId,
        reason: base.reason,
        since: a.first_sent_at as string,
        text: {
          en: describeAlert({ ...base, lang: "en" }),
          hi: describeAlert({ ...base, lang: "hi" }),
        },
      };
    });
}
