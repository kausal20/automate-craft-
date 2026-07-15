/**
 * Shared monitoring context.
 *
 * READ-ONLY: modules observe, never modify. Execution history is PASSED IN
 * rather than fetched, which is what makes the report a pure function of its
 * inputs — identical history ⇒ identical report.
 *
 * `now` is injected for the same reason: recency checks (webhook inactivity,
 * credential expiry) must not depend on hidden wall-clock.
 */

import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { DeploymentReport } from "../models/deployment";
import type {
  CredentialObservation,
  ExecutionRecord,
  NodeExecutionRecord,
  RuntimeEventRecord,
} from "../models/monitoring";

/** Thresholds — fixed so the report is reproducible. */
export const THRESHOLDS = {
  /** ≥ this many failures in the window is "repeated". */
  repeatedFailures: 3,
  /** ≥ this many failures back-to-back is an escalation. */
  consecutiveFailures: 3,
  /** Node runs averaging above this are "long". */
  longExecutionMs: 30_000,
  /** Retries / node-runs above this is a high retry rate. */
  highRetryRate: 0.25,
  /** ≥ this many retries on one node in the window is a storm. */
  retryStorm: 10,
  /** No trigger event for this long ⇒ inactivity alert. */
  webhookInactivityMs: 24 * 60 * 60 * 1000,
  /** Credential expiring within this window ⇒ warn early. */
  credentialExpiryWarnMs: 7 * 24 * 60 * 60 * 1000,
  /** An hour with ≥ this multiple of the median hourly rate is a spike. */
  spikeMultiplier: 3,
  /** Minimum executions before spike detection is meaningful. */
  spikeMinExecutions: 10,
  /** Same node running ≥ this many times in ONE execution suggests a loop. */
  loopRunsPerExecution: 5,
} as const;

export interface MonitoringContext {
  readonly sessionId: string;
  readonly ir: AgentWorkflowIR | null;
  readonly deployment: DeploymentReport | null;
  /** True when the deployment is currently active in n8n. */
  readonly active: boolean;
  readonly executions: readonly ExecutionRecord[];
  readonly nodeExecutions: readonly NodeExecutionRecord[];
  readonly runtimeEvents: readonly RuntimeEventRecord[];
  readonly credentials: readonly CredentialObservation[];
  /** Injected clock. */
  readonly now: number;
}
