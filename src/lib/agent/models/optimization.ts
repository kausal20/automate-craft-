/**
 * Optimization Agent models (Phase I).
 *
 * The Optimization Agent ANALYSES a deployed workflow's observed behaviour and
 * recommends improvements. It never modifies the IR, never deploys, and never
 * changes a production workflow — a recommendation is a proposal for a human.
 *
 * Honesty rules encoded here:
 *   - Every recommendation carries the OBSERVED evidence that produced it. No
 *     evidence ⇒ no recommendation. The agent stays silent rather than guessing.
 *   - `estimatedImpact` is computed from real measurements or reported as
 *     unquantified. It is never an invented number.
 *   - `confidence` is driven by the observed sample size, so advice from 3 runs
 *     is not presented like advice from 300.
 *   - Scores are null when there is nothing to score. "No data" ≠ "perfect".
 *   - Pure function of its inputs (reports are passed in, `createdAt` injected)
 *     ⇒ identical inputs produce an identical report.
 */

export type OptimizationCategory =
  | "performance"
  | "reliability"
  | "retry"
  | "timeout"
  | "structure"
  | "node"
  | "credential"
  | "cost";

export type OptimizationPriority = "P0" | "P1" | "P2" | "P3";
export type OptimizationSeverity = "info" | "low" | "medium" | "high" | "critical";
/** Confidence in the recommendation, driven by observed sample size. */
export type OptimizationConfidence = "low" | "medium" | "high";
export type ImplementationDifficulty = "trivial" | "easy" | "moderate" | "hard";
/** Risk that ACTING on the recommendation causes harm. */
export type RiskLevel = "none" | "low" | "medium" | "high";

export type OptimizationCode =
  // performance
  | "SLOW_NODE_BOTTLENECK"
  | "HIGH_P95_LATENCY"
  | "LONG_RUNNING_WORKFLOW"
  | "LOW_THROUGHPUT"
  // reliability
  | "HIGH_FAILURE_RATE"
  | "REPEATED_ERROR_PATTERN"
  | "API_INSTABILITY"
  | "UNRELIABLE_NODE"
  // retry
  | "INCREASE_RETRY_COUNT"
  | "DECREASE_RETRY_COUNT"
  | "ADD_RETRY_BACKOFF"
  | "INCREASE_RETRY_DELAY"
  | "RETRY_INEFFECTIVE"
  // timeout
  | "INCREASE_NODE_TIMEOUT"
  | "DECREASE_NODE_TIMEOUT"
  | "INCREASE_WORKFLOW_TIMEOUT"
  // structure
  | "UNUSED_NODE"
  | "DUPLICATE_WORK"
  | "LONG_CHAIN"
  | "PARALLELIZATION_OPPORTUNITY"
  // node
  | "NODE_CONFIG_IMPROVEMENT"
  | "NODE_ORDERING_IMPROVEMENT"
  // credential
  | "CREDENTIAL_EXPIRING"
  | "CREDENTIAL_REAUTH_REQUIRED"
  | "PERMISSION_INSUFFICIENT"
  // cost
  | "HIGH_FREQUENCY_EXECUTION"
  | "RETRY_WASTE"
  | "EXPENSIVE_API_USAGE";

/**
 * A quantified expectation. `value` is null when the improvement is real but
 * cannot be honestly measured from the data on hand.
 */
export interface EstimatedImpact {
  metric: "runtime" | "reliability" | "cost" | "unquantified";
  /** Computed from observed measurements. Null ⇒ unquantified. */
  value: number | null;
  unit: "ms" | "percent" | "executions" | null;
  /** How the number was derived, in words. */
  description: string;
}

export interface OptimizationRecommendation {
  /** Deterministic id derived from code + target — stable across runs. */
  id: string;
  code: OptimizationCode;
  category: OptimizationCategory;
  priority: OptimizationPriority;
  severity: OptimizationSeverity;
  title: string;
  /** The observed data that justifies this. Never speculative. */
  evidence: string;
  /** What improves if it is adopted. */
  expectedBenefit: string;
  estimatedImpact: EstimatedImpact;
  confidence: OptimizationConfidence;
  affectedNodes: string[];
  difficulty: ImplementationDifficulty;
  risk: RiskLevel;
  /** Why the agent concluded this, in full. */
  reasoning: string;
}

export interface ModuleOutcome {
  module: OptimizationCategory | "recommendation" | "readiness";
  /** Observations the module worked from. 0 ⇒ nothing to analyse. */
  observations: number;
  recommendations: number;
  note?: string;
}

/**
 * All scores are 0–100 where 100 = nothing to improve. Null when there is
 * insufficient observed data to score honestly — never a default of 100.
 */
export interface OptimizationScores {
  /** Weighted overall. Null when every component is null. */
  optimization: number | null;
  efficiency: number | null;
  reliability: number | null;
  performance: number | null;
  cost: number | null;
}

export interface OptimizationReport {
  sessionId: string;
  workflowId: string | null;
  revision: number | null;

  scores: OptimizationScores;
  /** Ranked best-first. */
  recommendations: OptimizationRecommendation[];
  /** Highest-priority subset, capped for display. */
  topRecommendations: OptimizationRecommendation[];
  /** Aggregate of every quantified impact, by metric. */
  expectedImprovements: {
    runtimeMs: number | null;
    reliabilityPercent: number | null;
    costExecutions: number | null;
  };
  summary: string;
  modules: ModuleOutcome[];
  /** Executions the analysis is based on — the reader's trust anchor. */
  sampleSize: number;
  createdAt: number;
}

const PRIORITY_RANK: Record<OptimizationPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const SEVERITY_RANK: Record<OptimizationSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};
const CONFIDENCE_RANK: Record<OptimizationConfidence, number> = { high: 0, medium: 1, low: 2 };

/**
 * Confidence from observed sample size. Deliberately conservative: advice drawn
 * from a handful of runs is marked low no matter how clear the signal looks.
 */
export function confidenceFromSample(sampleSize: number): OptimizationConfidence {
  if (sampleSize >= 30) return "high";
  if (sampleSize >= 10) return "medium";
  return "low";
}

/** Stable, derived id — no randomness, so reports diff cleanly across runs. */
export function recommendationId(code: OptimizationCode, target?: string): string {
  const slug = (target ?? "workflow")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return `opt_${code.toLowerCase()}__${slug || "workflow"}`;
}

/** Rank: priority → severity → confidence → id (fully deterministic). */
export function rankRecommendations(
  recommendations: OptimizationRecommendation[],
): OptimizationRecommendation[] {
  return [...recommendations].sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] ||
      a.id.localeCompare(b.id),
  );
}

/** Sum the quantified impacts. Unquantified ones are excluded, not guessed. */
export function aggregateImprovements(
  recommendations: OptimizationRecommendation[],
): OptimizationReport["expectedImprovements"] {
  const valuesFor = (metric: EstimatedImpact["metric"]) =>
    recommendations
      .filter((r) => r.estimatedImpact.metric === metric && r.estimatedImpact.value !== null)
      .map((r) => r.estimatedImpact.value as number);

  const sum = (metric: EstimatedImpact["metric"]) => {
    const v = valuesFor(metric);
    return v.length > 0 ? Math.round(v.reduce((a, b) => a + b, 0)) : null;
  };

  // Reliability gains do NOT add up. Two recommendations that each recover the
  // same failed runs would sum past 100%, claiming an improvement that cannot
  // exist. The most any single fix is expected to recover is the honest
  // headline; anything more would be an overclaim we cannot evidence.
  const reliabilityClaims = valuesFor("reliability");
  const reliabilityPercent =
    reliabilityClaims.length > 0 ? Math.min(100, Math.round(Math.max(...reliabilityClaims))) : null;

  return {
    // Runtime savings come from distinct nodes on a sequential chain, so they
    // accumulate.
    runtimeMs: sum("runtime"),
    reliabilityPercent,
    costExecutions: sum("cost"),
  };
}
