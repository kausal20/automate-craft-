/**
 * 12. Monitoring Readiness — can this workflow be monitored meaningfully?
 *
 * Runs LAST. It does not re-judge health; it reports how much OBSERVED data the
 * report is actually based on, so a reader never mistakes "nothing observed"
 * for "nothing wrong".
 */

import type { ModuleOutcome } from "../../models/monitoring";
import type { MonitoringContext } from "../context";

export function assessReadiness(ctx: MonitoringContext): ModuleOutcome {
  const observations =
    ctx.executions.length + ctx.nodeExecutions.length + ctx.runtimeEvents.length;

  if (!ctx.deployment) {
    return {
      module: "readiness",
      observations,
      note: "No deployment recorded — monitoring has no target. Health cannot be assessed.",
    };
  }
  if (!ctx.active) {
    return {
      module: "readiness",
      observations,
      note: "Deployment is not active; the workflow cannot produce new executions.",
    };
  }
  if (ctx.executions.length === 0) {
    return {
      module: "readiness",
      observations,
      note: "Active deployment with zero executions — health is UNKNOWN, not healthy.",
    };
  }
  return {
    module: "readiness",
    observations,
    note: `Monitoring ${ctx.executions.length} execution(s), ${ctx.nodeExecutions.length} node run(s), ${ctx.runtimeEvents.length} runtime event(s).`,
  };
}
