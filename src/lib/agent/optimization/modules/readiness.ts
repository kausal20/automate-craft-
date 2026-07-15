/**
 * 10. Optimization Readiness — is there enough observed data to advise at all?
 *
 * Runs FIRST as a gate. If the sample is too small, the agent produces no
 * recommendations and says why. Advice drawn from one or two runs is noise
 * dressed as insight, so it is better withheld.
 */

import type { ModuleOutcome } from "../../models/optimization";
import { OPT_THRESHOLDS, type OptimizationContext } from "../context";

export interface ReadinessVerdict {
  /** When false, no module may emit a recommendation. */
  canAdvise: boolean;
  outcome: ModuleOutcome;
}

export function assessOptimizationReadiness(ctx: OptimizationContext): ReadinessVerdict {
  const observations = ctx.sampleSize;

  if (!ctx.monitoring) {
    return {
      canAdvise: false,
      outcome: {
        module: "readiness",
        observations: 0,
        recommendations: 0,
        note: "No monitoring report — there is no observed behaviour to optimize against.",
      },
    };
  }

  if (!ctx.deployment) {
    return {
      canAdvise: false,
      outcome: {
        module: "readiness",
        observations,
        recommendations: 0,
        note: "Workflow has never been deployed; optimization needs real execution history.",
      },
    };
  }

  if (observations < OPT_THRESHOLDS.minSampleForAdvice) {
    return {
      canAdvise: false,
      outcome: {
        module: "readiness",
        observations,
        recommendations: 0,
        note: `Only ${observations} terminal execution(s) observed — below the ${OPT_THRESHOLDS.minSampleForAdvice} needed to advise. Recommendations withheld rather than guessed.`,
      },
    };
  }

  return {
    canAdvise: true,
    outcome: {
      module: "readiness",
      observations,
      recommendations: 0,
      note: `Analysing ${observations} terminal execution(s).`,
    },
  };
}
