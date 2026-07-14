/**
 * DeterministicWorkflowGenerator — WorkflowPlan → AgentWorkflowIR.
 *
 * Pure, deterministic lowering. No AI, no I/O, no validation, no deployment.
 *
 * Hard rules:
 *   - Never invents nodes/integrations/operations. Every node is lowered from
 *     an existing plan element and carries `planRef` back to it. The plan is
 *     itself catalog-bound (see planning/operation-map), and the generator
 *     re-reads the catalog only to derive param schemas — never to add work.
 *   - Never validates. Missing params are surfaced in `schemas.nodes[].missingParams`
 *     for the Validator; the generator does not error on them.
 *   - Never deploys.
 *   - Fully deterministic: derived ids, fixed ordering, and `createdAt`
 *     inherited from `plan.createdAt` — identical plan ⇒ byte-identical IR.
 *
 * Output shape: see models/workflow-ir.ts. `core` is the canonical deployable
 * `WorkflowIR`; graph/variables/mappings/schemas are derived projections of it.
 */

import {
  lookupOperation,
  type ParamRef,
  type SetupField,
  type Step,
  type SupportedIntegration,
  type Trigger,
  type WorkflowIR,
} from "@/lib/workflow";
import type { WorkflowGenerator } from "../interfaces";
import type {
  PlannedStep,
  PlannedTrigger,
  WorkflowPlan,
} from "../models/plan";
import {
  AGENT_IR_SCHEMA_VERSION,
  GENERATOR_VERSION,
  type AgentWorkflowIR,
  type IRConnectionSchema,
  type IREdge,
  type IRMapping,
  type IRNode,
  type IRNodeSchema,
  type IRVariable,
  type IRVariableType,
  type IOSchema,
} from "../models/workflow-ir";

/** Canonical IR schema version this generator emits (matches @/lib/workflow). */
const CORE_SCHEMA_VERSION = 1 as const;

const TRIGGER_NODE_ID = "trigger";

/** Param-name → variable type. Deterministic, closed vocabulary. */
const PARAM_TYPES: Record<string, IRVariableType> = {
  amount: "number",
  values: "array",
  row: "number",
  seconds: "number",
  email: "string",
  name: "string",
  text: "string",
  body: "string",
  html: "string",
  subject: "string",
  message: "string",
  content: "string",
  filename: "string",
  currency: "string",
  source: "string",
  company: "string",
  id: "string",
  input: "string",
  channel: "string",
  to: "string",
  sheet: "string",
  range: "string",
  url: "string",
  method: "string",
};

function typeOfParam(param: string): IRVariableType {
  return PARAM_TYPES[param] ?? "string";
}

/**
 * Raised when the generator is handed a plan that violates its input
 * contract (a plan carrying blocking issues). This is a PRECONDITION check on
 * the *plan*, not validation of the produced IR — the generator refuses to
 * lower an unbuildable plan rather than emit a non-canonical core.
 */
export class GeneratorPreconditionError extends Error {
  constructor(readonly reason: string) {
    super(`Cannot generate IR: ${reason}`);
    this.name = "GeneratorPreconditionError";
  }
}

class DeterministicWorkflowGenerator implements WorkflowGenerator {
  generate(input: { plan: WorkflowPlan; version: number }): AgentWorkflowIR {
    const { plan } = input;
    const revision = input.version;

    // Input contract: only a plan without blocking issues can be lowered.
    // A plan with zero steps cannot produce a canonical core (steps: min 1).
    if (!plan.ok) {
      const codes = plan.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.code)
        .join(", ");
      throw new GeneratorPreconditionError(
        `the plan has blocking issues (${codes || "unknown"}).`,
      );
    }
    if (plan.steps.length === 0) {
      throw new GeneratorPreconditionError("the plan contains no steps.");
    }

    /* ── 1. Canonical core (deployable IR) ─────────────────────── */
    const core = this.buildCore(plan);

    /* ── 2. Explicit graph ─────────────────────────────────────── */
    const nodes = this.buildNodes(plan);
    const edges = this.buildEdges(plan, nodes);

    /* ── 3. Variables + mappings ───────────────────────────────── */
    const { variables, mappings } = this.buildVariablesAndMappings(plan, nodes);

    /* ── 4. Connections ────────────────────────────────────────── */
    const connections = this.buildConnections(plan);

    /* ── 5. Schemas ────────────────────────────────────────────── */
    const schemas = {
      input: this.buildInputSchema(plan, variables),
      output: this.buildOutputSchema(nodes),
      nodes: this.buildNodeSchemas(plan),
    };

    /* ── 6. Metadata ───────────────────────────────────────────── */
    const metadata = {
      name: core.name,
      description: core.description,
      businessGoal: plan.businessGoal,
      confidence: plan.confidence,
      tags: this.buildTags(plan),
      planningWarnings: plan.planningWarnings,
      planningIssues: plan.issues,
    };

    return {
      irSchemaVersion: AGENT_IR_SCHEMA_VERSION,
      revision,
      generatorVersion: GENERATOR_VERSION,
      plannerVersion: plan.version,
      // Inherited (not Date.now) so identical plans yield identical IR.
      createdAt: plan.createdAt,
      metadata,
      core,
      graph: { nodes, edges },
      variables,
      mappings,
      connections,
      schemas,
    };
  }

  /* ── core ───────────────────────────────────────────────────── */

  private buildCore(plan: WorkflowPlan): WorkflowIR {
    const steps: Step[] = plan.steps.map((s) => this.lowerStep(s));
    return {
      schemaVersion: CORE_SCHEMA_VERSION,
      name: clampText(plan.name, 3, 120, "Automation Workflow"),
      description: clampText(plan.summary, 3, 480, "Generated automation workflow."),
      trigger: this.lowerTrigger(plan.trigger),
      steps,
      integrations: [...plan.integrations],
      setupFields: this.buildSetupFields(plan),
      status: "draft",
    };
  }

  private lowerStep(s: PlannedStep): Step {
    const params: Record<string, ParamRef> = {};
    // Sort keys for byte-stable output regardless of plan insertion order.
    for (const key of Object.keys(s.params).sort()) {
      params[key] = s.params[key] as ParamRef;
    }
    const step: Step = {
      id: s.id,
      name: clampText(s.label, 2, 120, s.id),
      kind: s.kind,
      operation: s.operation,
      params,
      next: [...s.next],
      onError: s.errorPolicy,
    };
    if (s.integration) step.integration = s.integration;
    return step;
  }

  /**
   * Lower the logical trigger into the canonical discriminated union.
   * Each branch supplies exactly the config keys its schema allows.
   */
  private lowerTrigger(t: PlannedTrigger): Trigger {
    switch (t.kind) {
      case "form":
        return {
          kind: "form",
          ...(t.integration ? { integration: t.integration } : {}),
          config: { formIdField: nonEmpty(t.config.formIdField, "formId") },
        };
      case "schedule":
        return {
          kind: "schedule",
          config: {
            cron: nonEmpty(t.config.cron, "0 9 * * *"),
            timezone: nonEmpty(t.config.timezone, "UTC"),
          },
        };
      case "webhook":
        return {
          kind: "webhook",
          ...(t.integration ? { integration: t.integration } : {}),
          config: { event: nonEmpty(t.config.event, "inbound") },
        };
      case "event":
        return {
          kind: "event",
          // event triggers require an integration; the planner always sets one.
          integration: (t.integration ?? "webhook") as SupportedIntegration,
          config: {
            eventName: nonEmpty(t.config.event ?? t.config.eventName, "event"),
          },
        };
      case "manual":
      default:
        return { kind: "manual", config: {} };
    }
  }

  /**
   * Setup fields = inputs the user must still supply. Derived from the plan's
   * unresolved items that map to a step param or the trigger source. Values
   * already resolved via clarification are inlined as literals, so they need
   * no form field. Credentials are handled by connections, not setup fields.
   */
  private buildSetupFields(plan: WorkflowPlan): SetupField[] {
    const fields: SetupField[] = [];
    const seen = new Set<string>();

    for (const item of plan.unresolvedItems) {
      // shapes: "<stepId>.<param>" | "trigger.source (form)" | "action:<concept>"
      if (item.startsWith("action:")) continue;

      let key: string;
      let label: string;
      let integration: SupportedIntegration | undefined;

      if (item.startsWith("trigger.source")) {
        key = "trigger_source";
        label = "Trigger source";
        integration = plan.trigger.integration ?? undefined;
      } else {
        const dot = item.lastIndexOf(".");
        if (dot < 0) continue;
        const stepId = item.slice(0, dot);
        const param = item.slice(dot + 1);
        key = toSnake(`${stepId}_${param}`);
        const step = plan.steps.find((s) => s.id === stepId);
        label = clampText(
          `${param} for ${step?.integration ?? "workflow"}`,
          2,
          80,
          param,
        );
        integration = step?.integration ?? undefined;
      }

      if (seen.has(key) || fields.length >= 20) continue;
      seen.add(key);

      fields.push({
        key: clampKey(key),
        label,
        type: "text",
        placeholder: "Enter a value",
        required: true,
        helpText: "Required before this workflow can run.",
        ...(integration ? { integration } : {}),
      });
    }

    return fields;
  }

  /* ── graph ──────────────────────────────────────────────────── */

  private buildNodes(plan: WorkflowPlan): IRNode[] {
    const orderIndex = new Map<string, number>();
    plan.executionOrder.forEach((id, i) => orderIndex.set(id, i));

    const dependenciesOf = (id: string) =>
      plan.dependencies.filter((d) => d.to === id).map((d) => d.from);

    const nodes: IRNode[] = [];

    // Trigger node — always first, always present.
    nodes.push({
      id: TRIGGER_NODE_ID,
      planRef: TRIGGER_NODE_ID,
      type: "trigger",
      kind: "trigger",
      integration: plan.trigger.integration,
      operation: plan.trigger.kind,
      params: {},
      executionOrder: orderIndex.get(TRIGGER_NODE_ID) ?? 0,
      dependencies: [],
      retryPolicy: { maxAttempts: 1, backoff: "none", baseDelayMs: 0 },
      timeoutPolicy: { timeoutMs: plan.timeoutStrategy.perStepMs },
      errorPolicy: "fail",
      metadata: {
        label: `Trigger: ${plan.trigger.kind}`,
        description: describeTrigger(plan.trigger),
      },
    });

    for (const s of plan.steps) {
      const params: Record<string, ParamRef> = {};
      for (const key of Object.keys(s.params).sort()) {
        params[key] = s.params[key] as ParamRef;
      }
      nodes.push({
        id: s.id,
        planRef: s.id,
        type: "action",
        kind: s.kind,
        integration: s.integration,
        operation: s.operation,
        params,
        executionOrder: orderIndex.get(s.id) ?? nodes.length,
        dependencies: dependenciesOf(s.id),
        retryPolicy:
          s.errorPolicy === "retry"
            ? {
                maxAttempts: (s.maxRetries ?? 2) + 1,
                backoff: plan.retryPolicy.backoff,
                baseDelayMs: plan.retryPolicy.baseDelayMs,
              }
            : { maxAttempts: 1, backoff: "none", baseDelayMs: 0 },
        timeoutPolicy: { timeoutMs: plan.timeoutStrategy.perStepMs },
        errorPolicy: s.errorPolicy,
        metadata: {
          label: s.label,
          description: `${s.integration ?? "builtin"}.${s.operation}`,
        },
      });
    }

    // Deterministic: sort by execution order, then id.
    return nodes.sort(
      (a, b) => a.executionOrder - b.executionOrder || a.id.localeCompare(b.id),
    );
  }

  /**
   * Edges mirror the plan's dependency list. Deduped, and only emitted when
   * both endpoints are real nodes (no dangling edges).
   */
  private buildEdges(plan: WorkflowPlan, nodes: IRNode[]): IREdge[] {
    const valid = new Set(nodes.map((n) => n.id));
    const seen = new Set<string>();
    const edges: IREdge[] = [];
    for (const d of plan.dependencies) {
      if (!valid.has(d.from) || !valid.has(d.to)) continue;
      const id = `e_${d.from}__${d.to}`;
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push({ id, from: d.from, to: d.to });
    }
    return edges;
  }

  /* ── variables + mappings ───────────────────────────────────── */

  private buildVariablesAndMappings(
    plan: WorkflowPlan,
    nodes: IRNode[],
  ): { variables: IRVariable[]; mappings: IRMapping[] } {
    const variables: IRVariable[] = [];
    const varIndex = new Map<string, string>(); // `${producedBy}.${path}` → id
    const mappings: IRMapping[] = [];

    const addVariable = (producedBy: string, path: string, param: string): string => {
      const key = `${producedBy}.${path}`;
      const existing = varIndex.get(key);
      if (existing) return existing;
      const id = `var_${toSnake(producedBy)}_${toSnake(path)}`;
      varIndex.set(key, id);
      variables.push({
        id,
        name: path,
        type: typeOfParam(param),
        producedBy,
        path,
      });
      return id;
    };

    for (const node of nodes) {
      if (node.type === "trigger") continue;
      for (const param of Object.keys(node.params).sort()) {
        const ref = node.params[param];
        let variableId: string | null = null;
        let refValue: string | null = null;
        let literalValue: string | null = null;

        switch (ref.source) {
          case "trigger":
            refValue = ref.ref;
            variableId = addVariable(TRIGGER_NODE_ID, ref.ref, param);
            break;
          case "step": {
            refValue = ref.ref;
            const dot = ref.ref.indexOf(".");
            const producer = dot > 0 ? ref.ref.slice(0, dot) : ref.ref;
            const path = dot > 0 ? ref.ref.slice(dot + 1) : "output";
            // Only bind to a real upstream node — never a dangling mapping.
            if (nodes.some((n) => n.id === producer)) {
              variableId = addVariable(producer, path, param);
            }
            break;
          }
          case "secret":
            refValue = ref.ref;
            break;
          case "literal":
            literalValue = ref.value;
            break;
          case "template":
            literalValue = ref.value;
            break;
        }

        mappings.push({
          id: `map_${toSnake(node.id)}_${toSnake(param)}`,
          nodeId: node.id,
          param,
          source: ref.source,
          ref: refValue,
          value: literalValue,
          variableId,
          planRef: node.planRef,
        });
      }
    }

    return { variables, mappings };
  }

  /* ── connections ────────────────────────────────────────────── */

  private buildConnections(plan: WorkflowPlan): IRConnectionSchema[] {
    return plan.requiredCredentials.map((c) => ({
      integration: c.integration,
      credentialRequired: true,
      connected: c.connected,
      usedByNodes: plan.steps
        .filter((s) => s.integration === c.integration)
        .map((s) => s.id),
    }));
  }

  /* ── schemas ────────────────────────────────────────────────── */

  /**
   * Input schema = everything the workflow consumes from outside:
   * trigger-produced variables + setup fields the user must supply.
   */
  private buildInputSchema(plan: WorkflowPlan, variables: IRVariable[]): IOSchema {
    const fields = variables
      .filter((v) => v.producedBy === TRIGGER_NODE_ID)
      .map((v) => ({
        name: v.path,
        type: v.type,
        required: true,
        description: `Supplied by the ${plan.trigger.kind} trigger.`,
      }));

    for (const f of this.buildSetupFields(plan)) {
      fields.push({
        name: f.key,
        type: "string" as IRVariableType,
        required: f.required,
        description: f.helpText,
      });
    }

    return { fields: fields.sort((a, b) => a.name.localeCompare(b.name)) };
  }

  /** Output schema = outputs of terminal nodes (no outgoing edges). */
  private buildOutputSchema(nodes: IRNode[]): IOSchema {
    const hasOutgoing = new Set<string>();
    for (const n of nodes) {
      for (const dep of n.dependencies) hasOutgoing.add(dep);
    }
    const terminals = nodes.filter((n) => !hasOutgoing.has(n.id));
    return {
      fields: terminals.map((n) => ({
        name: `${n.id}.output`,
        type: "object" as IRVariableType,
        required: false,
        description: `Result of ${n.metadata.label}.`,
      })),
    };
  }

  /**
   * Node schemas expose catalog-required params vs supplied params so the
   * Validator can flag gaps. The generator reports; it does not judge.
   */
  private buildNodeSchemas(plan: WorkflowPlan): IRNodeSchema[] {
    return plan.steps.map((s) => {
      const def = s.integration ? lookupOperation(s.integration, s.operation) : null;
      const required = def ? [...def.requiredParams] : [];
      const provided = Object.keys(s.params).sort();
      const missing = required.filter((p) => !provided.includes(p));
      return {
        nodeId: s.id,
        operation: s.operation,
        integration: s.integration,
        requiredParams: required,
        providedParams: provided,
        missingParams: missing,
        paramSchemas: [
          ...provided.map((p) => ({
            name: p,
            source: s.params[p].source,
            required: required.includes(p),
          })),
          ...missing.map((p) => ({ name: p, source: "missing" as const, required: true })),
        ],
      };
    });
  }

  /* ── tags ───────────────────────────────────────────────────── */

  private buildTags(plan: WorkflowPlan): string[] {
    const tags = new Set<string>();
    tags.add(`trigger:${plan.trigger.kind}`);
    for (const i of plan.integrations) tags.add(`integration:${i}`);
    if (!plan.ok) tags.add("has-blocking-issues");
    if (plan.confidence < 70) tags.add("low-confidence");
    return [...tags].sort();
  }
}

/* ── helpers ──────────────────────────────────────────────────── */

function nonEmpty(v: string | undefined, fallback: string): string {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : fallback;
}

/** Clamp text into [min,max]; substitute a fallback when too short. */
function clampText(v: string, min: number, max: number, fallback: string): string {
  const t = (v ?? "").trim();
  const base = t.length >= min ? t : fallback;
  return base.length > max ? base.slice(0, max) : base;
}

function toSnake(v: string): string {
  return v
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

/** Setup-field keys must be snake_case, start with a letter, length 2–80. */
function clampKey(v: string): string {
  let k = toSnake(v);
  if (!/^[a-z]/.test(k)) k = `f_${k}`;
  if (k.length < 2) k = `${k}_x`;
  return k.slice(0, 80);
}

function describeTrigger(t: PlannedTrigger): string {
  const parts = Object.entries(t.config)
    .filter(([, v]) => String(v).trim().length > 0)
    .map(([k, v]) => `${k}=${v}`);
  return parts.length > 0 ? `${t.kind} (${parts.join(", ")})` : t.kind;
}

export const workflowGenerator: WorkflowGenerator = new DeterministicWorkflowGenerator();
