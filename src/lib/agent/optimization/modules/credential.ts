/**
 * 7. Credential Optimizer.
 *
 * Reads the credential facts the Monitoring Agent OBSERVED (state + alerts).
 * It re-uses monitoring's observations rather than re-deriving them, so there
 * is one source of truth for credential health.
 */

import {
  confidenceFromSample,
  recommendationId,
  type OptimizationRecommendation,
} from "../../models/optimization";
import type { OptimizationContext } from "../context";

export function optimizeCredentials(ctx: OptimizationContext): OptimizationRecommendation[] {
  const m = ctx.monitoring;
  if (!m) return [];
  const confidence = confidenceFromSample(ctx.sampleSize);
  const out: OptimizationRecommendation[] = [];

  /**
   * Share of observed executions that failed — the ceiling on any reliability
   * recovery this module may claim. Null when nothing has failed yet, in which
   * case there is no observed loss to size a recovery against.
   */
  const failedShare =
    ctx.sampleSize > 0 && m.execution.failed > 0
      ? Math.round((m.execution.failed / ctx.sampleSize) * 100)
      : null;

  for (const alert of m.alerts) {
    switch (alert.code) {
      case "CREDENTIAL_EXPIRING":
        out.push({
          id: recommendationId("CREDENTIAL_EXPIRING", alert.target),
          code: "CREDENTIAL_EXPIRING",
          category: "credential",
          priority: "P1",
          severity: "high",
          title: alert.message,
          evidence: alert.evidence,
          expectedBenefit: "Avoids an outage when the token lapses.",
          estimatedImpact: {
            // The token has NOT lapsed yet, so nothing has failed because of
            // it. Quantifying a recovery here would be predicting a future
            // outage, not measuring an observed one.
            metric: "unquantified",
            value: null,
            unit: null,
            description:
              "No executions have failed from this yet; the impact is the outage avoided once the credential expires.",
          },
          confidence,
          affectedNodes: alert.target ? [alert.target] : [],
          difficulty: "trivial",
          risk: "none",
          reasoning:
            "The provider reported a concrete expiry date. Re-authorising before it passes prevents a predictable outage.",
        });
        break;

      case "CREDENTIAL_EXPIRED":
      case "CREDENTIAL_DISCONNECTED":
      case "OAUTH_FAILURE":
      case "TOKEN_REFRESH_FAILURE":
        out.push({
          id: recommendationId("CREDENTIAL_REAUTH_REQUIRED", alert.target),
          code: "CREDENTIAL_REAUTH_REQUIRED",
          category: "credential",
          priority: "P0",
          severity: "critical",
          title: `Re-authorize ${alert.target ?? "the integration"}`,
          evidence: alert.evidence,
          expectedBenefit: "Restores the workflow's ability to authenticate.",
          // Recovery is bounded by the runs that actually failed. Claiming
          // 100% would assert every execution is broken even when most are
          // observed succeeding.
          estimatedImpact:
            failedShare === null
              ? {
                  metric: "unquantified",
                  value: null,
                  unit: null,
                  description:
                    "The credential is rejected, but no failed executions have been observed yet to size the recovery.",
                }
              : {
                  metric: "reliability",
                  value: failedShare,
                  unit: "percent",
                  description: `Restoring the credential addresses the ${failedShare}% of observed executions that failed.`,
                },
          confidence,
          affectedNodes: alert.target ? [alert.target] : [],
          difficulty: "trivial",
          risk: "none",
          reasoning:
            "An authentication failure was observed at runtime. No amount of retry or timeout tuning fixes a credential the provider has rejected.",
        });
        break;

      case "PERMISSION_FAILURE":
        out.push({
          id: recommendationId("PERMISSION_INSUFFICIENT", alert.target),
          code: "PERMISSION_INSUFFICIENT",
          category: "credential",
          priority: "P0",
          severity: "critical",
          title: "Grant the missing permission scope",
          evidence: alert.evidence,
          expectedBenefit: "The affected operation becomes possible.",
          estimatedImpact: {
            metric: "reliability",
            value: 100,
            unit: "percent",
            description: "The operation fails on every attempt until the scope is granted.",
          },
          confidence,
          affectedNodes: alert.target ? [alert.target] : [],
          difficulty: "easy",
          risk: "none",
          reasoning:
            "The provider returned a permission error, which is a scope problem — retrying an unauthorised call cannot succeed.",
        });
        break;

      default:
        break;
    }
  }

  // Dedupe by id: several alerts can point at the same remedy.
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}
