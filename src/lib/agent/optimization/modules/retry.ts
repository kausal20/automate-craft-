/**
 * 3. Retry Optimizer.
 *
 * The whole point: only recommend a retry change when the observed retry
 * OUTCOME supports it.
 *
 *   retries firing AND mostly succeeding  → more attempts help
 *   retries firing AND mostly failing     → more attempts just burn time;
 *                                           fix the cause / reduce attempts
 *   retries on rate-limit/timeout errors  → backoff, not raw attempts
 *
 * No retries observed ⇒ nothing to say.
 */

import {
  confidenceFromSample,
  recommendationId,
  type OptimizationRecommendation,
} from "../../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "../context";

export function optimizeRetries(ctx: OptimizationContext): OptimizationRecommendation[] {
  const m = ctx.monitoring;
  if (!m) return [];
  const retry = m.analytics.retry;
  if (retry.retriedRuns === 0) return []; // no evidence, no advice

  const confidence = confidenceFromSample(ctx.sampleSize);
  const out: OptimizationRecommendation[] = [];
  const nodeRuns = m.nodes.reduce((s, n) => s + n.runs, 0);
  const retryRate = nodeRuns > 0 ? retry.retriedRuns / nodeRuns : null;
  const noisyNodes = m.nodes.filter((n) => n.retries > 0).map((n) => n.nodeId);

  /* ── retries are rescuing runs → allow more attempts ───────── */
  if (
    retry.retrySuccessRate !== null &&
    retry.retrySuccessRate >= OPT_THRESHOLDS.retryEffective &&
    retryRate !== null &&
    retryRate >= OPT_THRESHOLDS.notableRetryRate
  ) {
    out.push({
      id: recommendationId("INCREASE_RETRY_COUNT"),
      code: "INCREASE_RETRY_COUNT",
      category: "retry",
      priority: "P2",
      severity: "medium",
      title: "Increase retry count",
      evidence: `${Math.round(retry.retrySuccessRate * 100)}% of ${retry.retriedRuns} retried runs eventually succeeded; ${Math.round(retryRate * 100)}% of node runs needed a retry.`,
      expectedBenefit: "More transient failures recover automatically.",
      estimatedImpact: {
        metric: "reliability",
        value: Math.round(retry.retrySuccessRate * 100),
        unit: "percent",
        description: `Retries already rescue ${Math.round(retry.retrySuccessRate * 100)}% of retried runs; more attempts extend that.`,
      },
      confidence,
      affectedNodes: noisyNodes,
      difficulty: "trivial",
      risk: "low",
      reasoning:
        "Retries are demonstrably recovering runs, so raising the attempt budget converts more transient failures into successes.",
    });
  }

  /* ── retries are NOT helping → stop burning attempts ───────── */
  if (
    retry.retrySuccessRate !== null &&
    retry.retrySuccessRate < OPT_THRESHOLDS.retryIneffective
  ) {
    out.push({
      id: recommendationId("RETRY_INEFFECTIVE"),
      code: "RETRY_INEFFECTIVE",
      category: "retry",
      priority: "P1",
      severity: "high",
      title: "Retries are not recovering failures",
      evidence: `Only ${Math.round(retry.retrySuccessRate * 100)}% of ${retry.retriedRuns} retried runs succeeded; ${retry.totalRetries} retries were spent.`,
      expectedBenefit: "Faster failure surfacing and less wasted execution time.",
      estimatedImpact: {
        metric: "cost",
        value: retry.totalRetries,
        unit: "executions",
        description: `${retry.totalRetries} retry attempts are being spent with little recovery.`,
      },
      confidence,
      affectedNodes: noisyNodes,
      difficulty: "easy",
      risk: "medium",
      reasoning:
        "Retrying is not changing the outcome, which indicates a persistent fault rather than a transient one. Reducing attempts surfaces the real error sooner — but only after the root cause is understood, hence medium risk.",
    });

    out.push({
      id: recommendationId("DECREASE_RETRY_COUNT"),
      code: "DECREASE_RETRY_COUNT",
      category: "retry",
      priority: "P2",
      severity: "medium",
      title: "Reduce retry count",
      evidence: `${retry.totalRetries} retries produced only a ${Math.round(retry.retrySuccessRate * 100)}% recovery rate.`,
      expectedBenefit: "Less time and quota spent on attempts that do not succeed.",
      estimatedImpact: {
        metric: "cost",
        value: retry.totalRetries,
        unit: "executions",
        description: `Up to ${retry.totalRetries} attempts avoided per observed window.`,
      },
      confidence,
      affectedNodes: noisyNodes,
      difficulty: "trivial",
      risk: "medium",
      reasoning:
        "With recovery below the effective threshold, additional attempts mostly add latency. Reduce only once the underlying failure is addressed.",
    });
  }

  /* ── reason-driven backoff ─────────────────────────────────── */
  const rateLimited = retry.reasons.rate_limit ?? 0;
  const timedOut = retry.reasons.timeout ?? 0;
  if (rateLimited > 0) {
    out.push({
      id: recommendationId("ADD_RETRY_BACKOFF", "rate_limit"),
      code: "ADD_RETRY_BACKOFF",
      category: "retry",
      priority: "P1",
      severity: "high",
      title: "Use exponential backoff for rate limits",
      evidence: `${rateLimited} retry(s) followed rate-limit errors.`,
      expectedBenefit: "Fewer rejected calls and faster overall recovery.",
      estimatedImpact: {
        metric: "reliability",
        value: null,
        unit: null,
        description:
          "Depends on the provider's rate-limit window, which is not observable from here.",
      },
      confidence,
      affectedNodes: noisyNodes,
      difficulty: "trivial",
      risk: "none",
      reasoning:
        "Retrying a rate-limited call immediately reproduces the rejection; exponential backoff waits out the provider's window.",
    });
  }
  if (timedOut > 0) {
    out.push({
      id: recommendationId("INCREASE_RETRY_DELAY", "timeout"),
      code: "INCREASE_RETRY_DELAY",
      category: "retry",
      priority: "P2",
      severity: "medium",
      title: "Increase the delay between retries",
      evidence: `${timedOut} retry(s) followed timeout errors.`,
      expectedBenefit: "Gives a slow upstream time to recover before the next attempt.",
      estimatedImpact: {
        metric: "unquantified",
        value: null,
        unit: null,
        description: "Depends on upstream recovery time, which is not observable from here.",
      },
      confidence,
      affectedNodes: noisyNodes,
      difficulty: "trivial",
      risk: "none",
      reasoning:
        "Timeouts indicate a slow or saturated upstream; retrying immediately tends to hit the same condition.",
    });
  }

  return out;
}
