/**
 * Shared optimization context.
 *
 * READ-ONLY: modules analyse, never modify. Every upstream report is passed in,
 * so the agent is a pure function — identical inputs produce an identical
 * report. Thresholds are fixed here for the same reason.
 */

import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { ValidationReport } from "../models/validation";
import type { TestReport } from "../models/testing";
import type { DeploymentReport } from "../models/deployment";
import type { MonitoringReport } from "../models/monitoring";

export const OPT_THRESHOLDS = {
  /** A node consuming ≥ this share of workflow runtime is a bottleneck. */
  bottleneckShare: 0.4,
  /** p95 above this is worth flagging. */
  highP95Ms: 20_000,
  /**
   * How far p95 must exceed the median before a TAIL exists to report. Without
   * this, a uniformly slow workflow (p95 == median) gets flagged for "tail
   * latency" it does not have — and offered a 0ms saving. Uniform slowness is
   * LONG_RUNNING_WORKFLOW's concern, not this one.
   */
  tailRatio: 1.5,
  /** Average runtime above this is a long-running workflow. */
  longRuntimeMs: 30_000,
  /** Failure rate above this is unreliable. */
  highFailureRate: 0.1,
  /** Node success rate below this makes the node unreliable. */
  unreliableNodeRate: 0.8,
  /** Retry success rate at/above this means retries are earning their keep. */
  retryEffective: 0.5,
  /** Retry success rate below this means retrying is not helping. */
  retryIneffective: 0.2,
  /** Retry rate above this is worth acting on at all. */
  notableRetryRate: 0.2,
  /** Timeouts at/above this count justify a timeout change. */
  timeoutEvidence: 1,
  /** A node timeout more than this multiple of observed p95 is over-provisioned. */
  timeoutOverProvisionMultiple: 10,
  /** Executions/hour above this is high frequency. */
  highFrequencyPerHour: 60,
  /** Chains longer than this are worth reviewing. */
  longChainNodes: 5,
  /** Minimum terminal executions before ANY recommendation may be made. */
  minSampleForAdvice: 3,
} as const;

export interface OptimizationContext {
  readonly sessionId: string;
  readonly ir: AgentWorkflowIR | null;
  readonly validation: ValidationReport | null;
  readonly test: TestReport | null;
  readonly deployment: DeploymentReport | null;
  readonly monitoring: MonitoringReport | null;
  /** Terminal executions observed — the trust anchor for every recommendation. */
  readonly sampleSize: number;
}
