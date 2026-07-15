/**
 * 4. Runtime Monitor — read the runtime/log event stream.
 *
 * Classifies observed events so downstream modules (failure, credential,
 * alerts) reason over structured facts instead of re-parsing strings.
 */

import type { RuntimeEventRecord } from "../../models/monitoring";
import type { MonitoringContext } from "../context";

export interface RuntimeObservations {
  total: number;
  errors: RuntimeEventRecord[];
  warnings: RuntimeEventRecord[];
  /** kind → occurrences. */
  byKind: Record<string, number>;
  /** Credential/OAuth-related events. */
  credentialEvents: RuntimeEventRecord[];
  /** API/network-related events. */
  apiEvents: RuntimeEventRecord[];
  /** Timeout events. */
  timeoutEvents: RuntimeEventRecord[];
  /** Trigger/webhook receipt events. */
  triggerEvents: RuntimeEventRecord[];
  /** Most recent event time, or null. */
  lastEventAt: number | null;
}

const CREDENTIAL_RE = /credential|oauth|token|auth|permission|scope|unauthor|forbidden/i;
const API_RE = /api|http|network|econn|fetch|5\d\d|502|503|504/i;
const TIMEOUT_RE = /timeout|timed out|etimedout|deadline/i;
const TRIGGER_RE = /webhook|trigger|received|invoked/i;

export function monitorRuntime(ctx: MonitoringContext): RuntimeObservations {
  const events = ctx.runtimeEvents;
  const byKind: Record<string, number> = {};
  for (const e of events) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;

  const text = (e: RuntimeEventRecord) => `${e.kind} ${e.message}`;

  return {
    total: events.length,
    errors: events.filter((e) => e.level === "error"),
    warnings: events.filter((e) => e.level === "warning"),
    byKind,
    credentialEvents: events.filter((e) => CREDENTIAL_RE.test(text(e))),
    apiEvents: events.filter((e) => API_RE.test(text(e)) && e.level === "error"),
    timeoutEvents: events.filter((e) => TIMEOUT_RE.test(text(e))),
    triggerEvents: events.filter((e) => TRIGGER_RE.test(text(e))),
    lastEventAt: events.length > 0 ? Math.max(...events.map((e) => e.at)) : null,
  };
}
