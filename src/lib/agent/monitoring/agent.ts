/**
 * MonitoringAgent — composes the twelve single-responsibility monitors.
 *
 * Pipeline (fixed, deterministic order):
 *   execution → node → runtime → retry → failure → credential → performance
 *   → alert → health → analytics → recommendation → readiness
 *
 * Rules:
 *   - OBSERVE ONLY. Never modifies the IR, never deploys, never optimizes.
 *   - Pure function of its inputs: execution history is passed in, and `now` is
 *     injected, so identical history ⇒ identical report.
 *   - Never guesses: health is UNKNOWN when nothing terminal was observed and
 *     OFFLINE when the deployment is inactive. Absence of failures is not
 *     evidence of health.
 */

import type { MonitoringAgent } from "../interfaces";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { DeploymentReport } from "../models/deployment";
import {
  deriveHealth,
  deriveHealthScore,
  orderModules,
  type Alert,
  type CredentialObservation,
  type ExecutionRecord,
  type ModuleOutcome,
  type MonitoringReport,
  type NodeExecutionRecord,
  type RuntimeEventRecord,
} from "../models/monitoring";
import type { MonitoringContext } from "./context";
import { monitorExecutions } from "./modules/execution";
import { monitorNodes } from "./modules/node";
import { monitorRuntime } from "./modules/runtime";
import { monitorRetries } from "./modules/retry";
import { monitorFailures } from "./modules/failure";
import { monitorCredentials } from "./modules/credential";
import { monitorPerformance } from "./modules/performance";
import { evaluateAlerts } from "./modules/alert";
import { buildAnalytics } from "./modules/analytics";
import { buildRecommendations } from "./modules/recommendation";
import { assessReadiness } from "./modules/readiness";

/** Severity order for stable alert sorting. */
const SEVERITY_RANK: Record<Alert["severity"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

class WorkflowMonitoringAgent implements MonitoringAgent {
  observe(input: {
    sessionId: string;
    ir: AgentWorkflowIR | null;
    deployment: DeploymentReport | null;
    executions: ExecutionRecord[];
    nodeExecutions: NodeExecutionRecord[];
    runtimeEvents: RuntimeEventRecord[];
    credentials: CredentialObservation[];
    now: number;
    createdAt?: number;
  }): MonitoringReport {
    // Active = the deployment actually reported ACTIVE. Anything else (paused,
    // unknown, never deployed) is not something we may call live.
    const active = input.deployment?.activationStatus === "ACTIVE";

    const ctx: MonitoringContext = {
      sessionId: input.sessionId,
      ir: input.ir,
      deployment: input.deployment,
      active,
      executions: input.executions,
      nodeExecutions: input.nodeExecutions,
      runtimeEvents: input.runtimeEvents,
      credentials: input.credentials,
      now: input.now,
    };

    const modules: ModuleOutcome[] = [];

    /* ── 1. execution ──────────────────────────────────────────── */
    const summary = monitorExecutions(ctx);
    modules.push({ module: "execution", observations: ctx.executions.length });

    /* ── 3. node ───────────────────────────────────────────────── */
    const nodes = monitorNodes(ctx);
    modules.push({ module: "node", observations: ctx.nodeExecutions.length });

    /* ── 4. runtime ────────────────────────────────────────────── */
    const runtime = monitorRuntime(ctx);
    modules.push({ module: "runtime", observations: runtime.total });

    /* ── 5. retry ──────────────────────────────────────────────── */
    const retry = monitorRetries(ctx);
    modules.push({ module: "retry", observations: retry.retriedRuns });

    /* ── 6. failure ────────────────────────────────────────────── */
    const failures = monitorFailures(ctx, runtime);
    modules.push({ module: "failure", observations: failures.length });

    /* ── 7. credential ─────────────────────────────────────────── */
    const credentialHealth = monitorCredentials(ctx, runtime);
    modules.push({
      module: "credential",
      observations: ctx.credentials.length,
      ...(ctx.credentials.length === 0
        ? { note: "No credential state observed; credential health not assessed." }
        : {}),
    });

    /* ── 8. performance ────────────────────────────────────────── */
    const performance = monitorPerformance(ctx, nodes);
    modules.push({ module: "performance", observations: ctx.executions.length });

    /* ── 9. alerts (execution/perf/liveness + credential) ──────── */
    const nodeRuns = ctx.nodeExecutions.length;
    const retryRate = nodeRuns > 0 ? retry.retriedRuns / nodeRuns : null;
    const alerts = [
      ...evaluateAlerts({ ctx, summary, nodes, performance, runtime, retryRate }),
      ...credentialHealth.alerts,
    ].sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        a.code.localeCompare(b.code) ||
        (a.target ?? "").localeCompare(b.target ?? ""),
    );
    modules.push({ module: "alert", observations: alerts.length });

    /* ── 2. health (needs alerts) ──────────────────────────────── */
    const health = deriveHealth({ active, summary, alerts });
    const healthScore = deriveHealthScore({ health, summary, alerts });
    modules.push({ module: "health", observations: summary.succeeded + summary.failed });

    /* ── 10. analytics ─────────────────────────────────────────── */
    const analytics = buildAnalytics({ ctx, summary, nodes, performance, retry });
    modules.push({ module: "analytics", observations: analytics.executionCount });

    /* ── 11. recommendations ───────────────────────────────────── */
    const recommendations = buildRecommendations({
      ctx,
      summary,
      nodes,
      performance,
      retry,
      runtime,
      alerts,
    });
    modules.push({ module: "recommendation", observations: recommendations.length });

    /* ── 12. readiness ─────────────────────────────────────────── */
    modules.push(assessReadiness(ctx));

    return {
      sessionId: input.sessionId,
      workflowId: input.deployment?.workflowId ?? null,
      revision: input.ir?.revision ?? null,
      health,
      healthScore,
      execution: summary,
      nodes,
      performance,
      failures,
      credentials: credentialHealth.observations,
      alerts,
      recommendations,
      analytics,
      modules: orderModules(modules),
      windowStart: summary.firstExecutionAt,
      windowEnd: summary.lastExecutionAt,
      createdAt: input.createdAt ?? input.now,
    };
  }
}

export const monitoringAgent: MonitoringAgent = new WorkflowMonitoringAgent();
