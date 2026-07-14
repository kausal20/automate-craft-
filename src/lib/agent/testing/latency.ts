/**
 * Deterministic latency ESTIMATES.
 *
 * These are static per-integration expectations used for performance testing
 * and the execution timeline. They are NOT measurements — the Testing Agent
 * never executes a node, so nothing real is timed. Keeping them static is what
 * lets an identical IR produce an identical Test Report.
 *
 * Values are conservative round-trip expectations for a single API call.
 */

import type { SupportedIntegration } from "@/lib/workflow";

export const INTEGRATION_LATENCY_MS: Record<SupportedIntegration, number> = {
  forms: 100,
  webhook: 250,
  slack: 300,
  stripe: 400,
  razorpay: 400,
  whatsapp: 450,
  crm: 500,
  email: 500,
  sheets: 600,
  google: 600,
  hubspot: 700,
  salesforce: 800,
};

/** Builtin transforms run in-process. */
export const BUILTIN_LATENCY_MS = 20;

/** A node slower than this is flagged as a bottleneck. */
export const SLOW_NODE_THRESHOLD_MS = 600;

/** Chains longer than this are flagged for latency + failure surface. */
export const LONG_CHAIN_THRESHOLD = 5;

/** Estimated runtime above this is flagged. */
export const SLOW_WORKFLOW_THRESHOLD_MS = 5_000;

export function estimateNodeMs(integration: SupportedIntegration | null): number {
  return integration ? INTEGRATION_LATENCY_MS[integration] : BUILTIN_LATENCY_MS;
}
