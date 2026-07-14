/**
 * Shared validator context.
 *
 * Every validator is a pure function `(ctx) => ValidationIssue[]`. The context
 * is READ-ONLY — validators inspect the IR, never modify it. Connection facts
 * are passed in rather than fetched so validation stays deterministic + unit
 * testable.
 */

import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { KnownConnection } from "../models/session";
import type { PlanTier } from "@/lib/workflow";

export interface ValidatorContext {
  readonly ir: AgentWorkflowIR;
  readonly knownConnections: readonly KnownConnection[];
  /** Plan tier drives size limits. Defaults to "starter". */
  readonly plan: PlanTier;
}
