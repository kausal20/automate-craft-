/**
 * Agent Workflow IR — the canonical, single source of truth produced by the
 * Workflow Generator (Phase D).
 *
 * Structure:
 *
 *   AgentWorkflowIR
 *     ├─ core        → the canonical, DEPLOYABLE `WorkflowIR` (@/lib/workflow).
 *     │                This is what validators + adapters consume. It is the
 *     │                authoritative representation of the automation.
 *     ├─ graph       → explicit execution graph (nodes + edges with stable ids)
 *     ├─ variables   → typed values produced by the trigger / upstream nodes
 *     ├─ mappings    → every node param ← its provenance (traceable to plan)
 *     ├─ connections → integrations + credential requirements
 *     ├─ schemas     → input/output/node/param schemas for the Validator
 *     └─ metadata    → name, goal, confidence, warnings, issues, tags, versions
 *
 * `graph`, `variables`, `mappings` and `schemas` are DERIVED projections of
 * `core` — not competing representations. `core` remains the only thing that
 * executes; the projections exist so downstream phases don't have to re-derive
 * them (and so generation stays explainable + traceable back to the plan).
 *
 * Determinism: every field is a pure function of the WorkflowPlan, including
 * `createdAt` (inherited from `plan.createdAt`). Identical plan → byte-identical IR.
 */

import type {
  ParamRef,
  StepKind,
  SupportedIntegration,
  WorkflowIR,
} from "@/lib/workflow";
import type { PlanningIssue, PlanningWarning } from "./plan";

/** Bumped when the AgentWorkflowIR document shape changes (migration key). */
export const AGENT_IR_SCHEMA_VERSION = 1 as const;

/** Bumped when generation logic changes in a way that alters output. */
export const GENERATOR_VERSION = "1.0.0" as const;

/* ── Variables + mappings ─────────────────────────────────────────── */

export type IRVariableType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "unknown";

export interface IRVariable {
  /** Stable id: `var_<producedBy>_<path>` (dots → underscores). */
  id: string;
  /** Human name, e.g. "payload.email". */
  name: string;
  type: IRVariableType;
  /** Node that produces it: "trigger" or a node id. */
  producedBy: string;
  /** Dotted access path within the producer's output. */
  path: string;
}

export interface IRMapping {
  /** Stable id: `map_<nodeId>_<param>`. */
  id: string;
  nodeId: string;
  param: string;
  source: ParamRef["source"];
  /** For trigger/step/secret sources. */
  ref: string | null;
  /** For literal/template sources. */
  value: string | null;
  /** Resolved variable id when the source is trigger/step; else null. */
  variableId: string | null;
  /** Traceability: plan step id this mapping came from. */
  planRef: string;
}

/* ── Policies ─────────────────────────────────────────────────────── */

export interface IRRetryPolicy {
  maxAttempts: number;
  backoff: "none" | "fixed" | "exponential";
  baseDelayMs: number;
}

export interface IRTimeoutPolicy {
  timeoutMs: number;
}

export type IRErrorPolicy = "fail" | "continue" | "retry";

/* ── Graph ────────────────────────────────────────────────────────── */

export interface IRNode {
  /** Stable id. "trigger" for the trigger node; plan step id otherwise. */
  id: string;
  /** Traceability: the WorkflowPlan element this node came from. */
  planRef: string;
  type: "trigger" | "action";
  /** Canonical step kind; "trigger" for the trigger node. */
  kind: StepKind | "trigger";
  integration: SupportedIntegration | null;
  /** Catalog operation; for the trigger node, the trigger kind. */
  operation: string;
  params: Record<string, ParamRef>;
  /** 0-based position in the topological execution order. */
  executionOrder: number;
  /** Ids of nodes that must run before this one. */
  dependencies: string[];
  retryPolicy: IRRetryPolicy;
  timeoutPolicy: IRTimeoutPolicy;
  errorPolicy: IRErrorPolicy;
  metadata: { label: string; description: string };
}

export interface IREdge {
  /** Stable id: `e_<from>__<to>`. */
  id: string;
  from: string;
  to: string;
}

/* ── Schemas (consumed by the Validator in a later phase) ─────────── */

export interface IRFieldSchema {
  name: string;
  type: IRVariableType;
  required: boolean;
  description?: string;
}

export interface IOSchema {
  fields: IRFieldSchema[];
}

export interface IRParamSchema {
  name: string;
  /** Where the value comes from. */
  source: ParamRef["source"] | "missing";
  required: boolean;
}

export interface IRNodeSchema {
  nodeId: string;
  operation: string;
  integration: SupportedIntegration | null;
  /** Catalog-declared required params. */
  requiredParams: string[];
  /** Params actually supplied by the plan. */
  providedParams: string[];
  /** requiredParams − providedParams. Validator turns these into errors. */
  missingParams: string[];
  paramSchemas: IRParamSchema[];
}

export interface IRConnectionSchema {
  integration: SupportedIntegration;
  credentialRequired: boolean;
  /** Advisory snapshot from planning; the Validator re-checks authoritatively. */
  connected: boolean;
  usedByNodes: string[];
}

/* ── Metadata ─────────────────────────────────────────────────────── */

export interface IRMetadata {
  name: string;
  description: string;
  businessGoal: string | null;
  /** Planner confidence carried forward (0–100). */
  confidence: number;
  tags: string[];
  planningWarnings: PlanningWarning[];
  planningIssues: PlanningIssue[];
}

/* ── Document ─────────────────────────────────────────────────────── */

export interface AgentWorkflowIR {
  /** Document schema version — migration key for future upgrades. */
  irSchemaVersion: number;
  /** Monotonic revision within the session. Prior revisions are retained. */
  revision: number;
  generatorVersion: string;
  /** Version of the WorkflowPlan this IR was generated from. */
  plannerVersion: number;
  /** Inherited from plan.createdAt to keep generation fully deterministic. */
  createdAt: number;

  metadata: IRMetadata;

  /** Canonical deployable IR — the authoritative representation. */
  core: WorkflowIR;

  graph: { nodes: IRNode[]; edges: IREdge[] };
  variables: IRVariable[];
  mappings: IRMapping[];
  connections: IRConnectionSchema[];
  schemas: { input: IOSchema; output: IOSchema; nodes: IRNodeSchema[] };
}
