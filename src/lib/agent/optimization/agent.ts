/**
 * OptimizationAgent — composes the ten single-responsibility optimizers.
 *
 * Pipeline (fixed, deterministic order):
 *   readiness gate → performance → reliability → retry → timeout → structure
 *   → node → credential → cost → recommendation engine (rank + score)
 *
 * Rules:
 *   - ANALYSE ONLY. Never modifies the IR, never deploys, never changes a
 *     production workflow. Output is a proposal for a human.
 *   - Evidence-bound: readiness gates everything. Below the minimum sample the
 *     agent emits ZERO recommendations and says why — silence beats guessing.
 *   - Deterministic: derived ids, fixed ordering, injected `createdAt`.
 */

import type { OptimizationAgent } from "../interfaces";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { ValidationReport } from "../models/validation";
import type { TestReport } from "../models/testing";
import type { DeploymentReport } from "../models/deployment";
import type { MonitoringReport } from "../models/monitoring";
import {
  aggregateImprovements,
  rankRecommendations,
  type ModuleOutcome,
  type OptimizationRecommendation,
  type OptimizationReport,
} from "../models/optimization";
import type { OptimizationContext } from "./context";
import { assessOptimizationReadiness } from "./modules/readiness";
import { optimizePerformance } from "./modules/performance";
import { optimizeReliability } from "./modules/reliability";
import { optimizeRetries } from "./modules/retry";
import { optimizeTimeouts } from "./modules/timeout";
import { optimizeStructure } from "./modules/structure";
import { optimizeNodes } from "./modules/node";
import { optimizeCredentials } from "./modules/credential";
import { optimizeCost } from "./modules/cost";
import { buildSummary, computeScores } from "./scoring";

/** How many recommendations `topRecommendations` surfaces. */
const TOP_N = 5;

class WorkflowOptimizationAgent implements OptimizationAgent {
  analyze(input: {
    sessionId: string;
    ir: AgentWorkflowIR | null;
    validation: ValidationReport | null;
    test: TestReport | null;
    deployment: DeploymentReport | null;
    monitoring: MonitoringReport | null;
    createdAt?: number;
  }): OptimizationReport {
    // Sample = terminal executions. Running/cancelled runs prove nothing about
    // success or failure, so they must not inflate confidence.
    const sampleSize = input.monitoring
      ? input.monitoring.execution.succeeded + input.monitoring.execution.failed
      : 0;

    const ctx: OptimizationContext = {
      sessionId: input.sessionId,
      ir: input.ir,
      validation: input.validation,
      test: input.test,
      deployment: input.deployment,
      monitoring: input.monitoring,
      sampleSize,
    };

    const modules: ModuleOutcome[] = [];

    /* ── 0. readiness gate ─────────────────────────────────────── */
    const readiness = assessOptimizationReadiness(ctx);
    if (!readiness.canAdvise) {
      const scores = computeScores(ctx, []);
      return {
        sessionId: input.sessionId,
        workflowId: input.deployment?.workflowId ?? null,
        revision: input.ir?.revision ?? null,
        scores,
        recommendations: [],
        topRecommendations: [],
        expectedImprovements: { runtimeMs: null, reliabilityPercent: null, costExecutions: null },
        summary: readiness.outcome.note ?? "Insufficient data to optimize.",
        modules: [readiness.outcome],
        sampleSize,
        createdAt: input.createdAt ?? Date.now(),
      };
    }

    /* ── 1–8. analyzers ────────────────────────────────────────── */
    const stages: Array<{
      module: ModuleOutcome["module"];
      run: (c: OptimizationContext) => OptimizationRecommendation[];
      observations: number;
    }> = [
      { module: "performance", run: optimizePerformance, observations: sampleSize },
      { module: "reliability", run: optimizeReliability, observations: sampleSize },
      {
        module: "retry",
        run: optimizeRetries,
        observations: input.monitoring?.analytics.retry.retriedRuns ?? 0,
      },
      {
        module: "timeout",
        run: optimizeTimeouts,
        observations: input.monitoring?.failures.filter((f) => f.kind === "timeout").length ?? 0,
      },
      {
        module: "structure",
        run: optimizeStructure,
        observations: ctx.ir?.graph.nodes.length ?? 0,
      },
      { module: "node", run: optimizeNodes, observations: input.monitoring?.nodes.length ?? 0 },
      {
        module: "credential",
        run: optimizeCredentials,
        observations: input.monitoring?.credentials.length ?? 0,
      },
      { module: "cost", run: optimizeCost, observations: sampleSize },
    ];

    const all: OptimizationRecommendation[] = [];
    for (const stage of stages) {
      const produced = stage.run(ctx);
      all.push(...produced);
      modules.push({
        module: stage.module,
        observations: stage.observations,
        recommendations: produced.length,
      });
    }

    /* ── 9. recommendation engine: dedupe + rank ───────────────── */
    const seen = new Set<string>();
    const deduped = all.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    const recommendations = rankRecommendations(deduped);
    modules.push({
      module: "recommendation",
      observations: all.length,
      recommendations: recommendations.length,
    });

    /* ── 10. readiness outcome (with final count) ──────────────── */
    modules.push({ ...readiness.outcome, recommendations: recommendations.length });

    const scores = computeScores(ctx, recommendations);

    return {
      sessionId: input.sessionId,
      workflowId: input.deployment?.workflowId ?? null,
      revision: input.ir?.revision ?? null,
      scores,
      recommendations,
      topRecommendations: recommendations.slice(0, TOP_N),
      expectedImprovements: aggregateImprovements(recommendations),
      summary: buildSummary(ctx, recommendations, scores),
      modules,
      sampleSize,
      createdAt: input.createdAt ?? Date.now(),
    };
  }
}

export const optimizationAgent: OptimizationAgent = new WorkflowOptimizationAgent();
