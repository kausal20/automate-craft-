/**
 * Optimization scoring.
 *
 * Every score is 0–100 where 100 = nothing to improve, and NULL when the
 * observed data cannot support a score. Null is deliberate: defaulting an
 * un-measurable dimension to 100 would report an unknown as perfect.
 */

import type { OptimizationRecommendation, OptimizationScores } from "../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "./context";

/** Penalty a recommendation contributes to its dimension's score. */
function penaltyOf(r: OptimizationRecommendation): number {
  switch (r.severity) {
    case "critical":
      return 30;
    case "high":
      return 18;
    case "medium":
      return 10;
    case "low":
      return 4;
    default:
      return 0;
  }
}

/**
 * Score a dimension from BOTH the measured reality and the advice raised
 * against it, taking whichever is worse.
 *
 * Penalties alone are not enough: recommendation count is a property of our
 * analyzers, not of the workflow. A workflow failing 88% of its runs must
 * score terribly on reliability even if that produced only one finding.
 * `base` carries the measurement; the penalty can only pull it further down.
 */
function scoreFor(
  recommendations: OptimizationRecommendation[],
  categories: OptimizationRecommendation["category"][],
  base: number | null,
): number | null {
  if (base === null) return null;
  const relevant = recommendations.filter((r) => categories.includes(r.category));
  const penalty = relevant.reduce((sum, r) => sum + penaltyOf(r), 0);
  return Math.max(0, Math.min(100, Math.min(base, 100 - penalty)));
}

/**
 * Runtime → 0..100. Full marks at or under a third of the long-runtime
 * guidance, zero at triple it, linear between. Anchored to the same threshold
 * the performance analyzer uses, so score and advice never disagree.
 */
function runtimeBase(averageRuntimeMs: number): number {
  const fast = OPT_THRESHOLDS.longRuntimeMs / 3;
  const slow = OPT_THRESHOLDS.longRuntimeMs * 3;
  if (averageRuntimeMs <= fast) return 100;
  if (averageRuntimeMs >= slow) return 0;
  return Math.round(100 * (1 - (averageRuntimeMs - fast) / (slow - fast)));
}

export function computeScores(
  ctx: OptimizationContext,
  recommendations: OptimizationRecommendation[],
): OptimizationScores {
  const m = ctx.monitoring;
  const enoughData = !!m && ctx.sampleSize >= OPT_THRESHOLDS.minSampleForAdvice;

  // Each dimension is only scoreable when the data behind it exists; null
  // base ⇒ null score. Reporting an unknown as 100 would be a lie.
  const avgRuntime = enoughData ? m!.performance.averageRuntimeMs : null;
  const performance = scoreFor(
    recommendations,
    ["performance", "timeout"],
    avgRuntime === null ? null : runtimeBase(avgRuntime),
  );

  const successRate = enoughData ? m!.execution.successRate : null;
  const reliability = scoreFor(
    recommendations,
    ["reliability", "retry", "credential"],
    successRate === null ? null : Math.round(successRate * 100),
  );

  const cost = scoreFor(
    recommendations,
    ["cost"],
    enoughData && m!.performance.throughputPerHour !== null ? 100 : null,
  );

  // No single metric measures structural efficiency, so this dimension is
  // penalty-driven — but every structure/node finding behind it is itself
  // evidence-gated.
  const efficiency = scoreFor(recommendations, ["structure", "node"], enoughData && !!ctx.ir ? 100 : null);

  const parts = [performance, reliability, cost, efficiency].filter(
    (s): s is number => s !== null,
  );
  const optimization =
    parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;

  return { optimization, efficiency, reliability, performance, cost };
}

/** One-line human summary. Says plainly when nothing could be assessed. */
export function buildSummary(
  ctx: OptimizationContext,
  recommendations: OptimizationRecommendation[],
  scores: OptimizationScores,
): string {
  if (scores.optimization === null) {
    return `Not enough observed data to optimize (${ctx.sampleSize} terminal execution(s)). No recommendations made.`;
  }
  if (recommendations.length === 0) {
    return `No optimizations identified across ${ctx.sampleSize} observed execution(s); the workflow scores ${scores.optimization}/100.`;
  }
  const p0 = recommendations.filter((r) => r.priority === "P0").length;
  const p1 = recommendations.filter((r) => r.priority === "P1").length;
  const urgency = p0 > 0 ? `${p0} urgent` : p1 > 0 ? `${p1} high-priority` : "no urgent";
  return `${recommendations.length} recommendation(s) from ${ctx.sampleSize} observed execution(s) — ${urgency}. Overall ${scores.optimization}/100.`;
}
