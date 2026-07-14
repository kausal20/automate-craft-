/**
 * 1. Execution Simulator — the core dry run.
 *
 * Walks the IR's execution order and, for each node, resolves every parameter
 * against the synthetic trigger payload and the simulated outputs of upstream
 * nodes. NOTHING IS EXECUTED: no integration is called, no production action
 * occurs. Outputs are synthetic shapes.
 *
 * A node whose reference cannot resolve is a FAILURE, never a silent skip —
 * that is exactly the class of bug this phase exists to catch.
 *
 * Fully deterministic: the sample payload is derived from the IR's input schema
 * by type/name, and timings are static estimates (see ../latency.ts).
 */

import type { ParamRef } from "@/lib/workflow";
import type { AgentWorkflowIR, IRNode, IRVariableType } from "../../models/workflow-ir";
import { estimateNodeMs } from "../latency";

export interface SimulatedNode {
  node: IRNode;
  /** Params resolved to concrete synthetic values. */
  resolvedInputs: Record<string, unknown>;
  /** Synthetic output the node would produce. Null when the node failed. */
  output: Record<string, unknown> | null;
  /** Params that could not be resolved (param → reason). */
  unresolved: Array<{ param: string; reason: string }>;
  ok: boolean;
  estimatedMs: number;
  /** Whether the node is reachable from the trigger. */
  reachable: boolean;
}

export interface SimulationResult {
  samplePayload: Record<string, unknown>;
  /** In execution order. */
  nodes: SimulatedNode[];
  /** Cumulative estimated runtime along the chain. */
  estimatedRuntimeMs: number;
}

/* ── deterministic sample-value synthesis ─────────────────────────── */

const NAME_HINTS: Array<[RegExp, unknown]> = [
  [/email/i, "user@example.com"],
  [/phone|to$|whatsapp/i, "+15551234567"],
  [/amount|price|total/i, 100],
  [/currency/i, "USD"],
  [/url|link/i, "https://example.com/sample"],
  [/name/i, "Sample Name"],
  [/company/i, "Example Inc"],
  [/subject/i, "Sample subject"],
  [/id$/i, "sample_id"],
];

function sampleForType(type: IRVariableType): unknown {
  switch (type) {
    case "number":
      return 42;
    case "boolean":
      return true;
    case "array":
      return ["sample"];
    case "object":
      return { sample: true };
    case "unknown":
      return null;
    case "string":
    default:
      return "sample_text";
  }
}

/** Name-aware, type-aware, and fully deterministic. */
export function sampleValue(name: string, type: IRVariableType): unknown {
  for (const [re, value] of NAME_HINTS) {
    if (re.test(name)) return value;
  }
  return sampleForType(type);
}

/**
 * Build the synthetic trigger payload from the IR input schema (trigger-produced
 * fields only — setup fields are configuration, not payload).
 */
export function buildSamplePayload(ir: AgentWorkflowIR): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const v of ir.variables) {
    if (v.producedBy !== "trigger") continue;
    // paths look like "payload.email" → nest under payload
    setPath(payload, v.path, sampleValue(v.path, v.type));
  }
  return payload;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof cursor[key] !== "object" || cursor[key] === null) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

function getPath(source: unknown, path: string): { found: boolean; value: unknown } {
  let cursor: unknown = source;
  for (const key of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null || !(key in (cursor as object))) {
      return { found: false, value: undefined };
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return { found: true, value: cursor };
}

/* ── simulation ───────────────────────────────────────────────────── */

/** Reachability from the trigger node, via graph edges. */
function reachableNodeIds(ir: AgentWorkflowIR): Set<string> {
  const root = ir.graph.nodes.find((n) => n.type === "trigger")?.id;
  const reachable = new Set<string>();
  if (!root) return reachable;
  const adjacency = new Map<string, string[]>();
  for (const n of ir.graph.nodes) adjacency.set(n.id, []);
  for (const e of ir.graph.edges) adjacency.get(e.from)?.push(e.to);
  const queue = [root];
  reachable.add(root);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }
  return reachable;
}

/**
 * Resolve one ParamRef against the payload + prior node outputs.
 * Returns `found:false` with a reason when the reference is dangling.
 */
function resolveRef(
  ref: ParamRef,
  payload: Record<string, unknown>,
  outputs: Map<string, Record<string, unknown> | null>,
): { found: boolean; value: unknown; reason?: string } {
  switch (ref.source) {
    case "literal":
      return { found: true, value: ref.value };
    case "template":
      // Templates are resolved by the adapter at runtime; the simulator only
      // confirms a value is present.
      return { found: true, value: ref.value };
    case "secret":
      // Secret material is never read here — presence of the reference is all
      // the simulator checks. Credential validity is the credential module's job.
      return { found: true, value: `<secret:${ref.ref}>` };
    case "trigger": {
      const hit = getPath(payload, ref.ref);
      return hit.found
        ? { found: true, value: hit.value }
        : { found: false, value: undefined, reason: `trigger payload has no "${ref.ref}"` };
    }
    case "step": {
      const dot = ref.ref.indexOf(".");
      const producer = dot > 0 ? ref.ref.slice(0, dot) : ref.ref;
      const path = dot > 0 ? ref.ref.slice(dot + 1) : "output";
      if (!outputs.has(producer)) {
        return { found: false, value: undefined, reason: `step "${producer}" has not run before this node` };
      }
      const out = outputs.get(producer);
      if (out === null) {
        return { found: false, value: undefined, reason: `step "${producer}" failed and produced no output` };
      }
      const hit = getPath(out, path);
      return hit.found
        ? { found: true, value: hit.value }
        : { found: false, value: undefined, reason: `step "${producer}" does not output "${path}"` };
    }
  }
}

/** Synthetic output shape for a node. Deterministic. */
function simulateOutput(node: IRNode): Record<string, unknown> {
  return {
    output: `<${node.integration ?? "builtin"}.${node.operation} result>`,
    ok: true,
    id: `${node.id}_result`,
  };
}

export function simulate(ir: AgentWorkflowIR): SimulationResult {
  const samplePayload = buildSamplePayload(ir);
  const reachable = reachableNodeIds(ir);
  const outputs = new Map<string, Record<string, unknown> | null>();
  const nodes: SimulatedNode[] = [];
  let runtime = 0;

  const ordered = [...ir.graph.nodes].sort(
    (a, b) => a.executionOrder - b.executionOrder || a.id.localeCompare(b.id),
  );

  for (const node of ordered) {
    if (node.type === "trigger") {
      // The trigger emits the payload; nothing to resolve.
      outputs.set(node.id, { payload: samplePayload });
      nodes.push({
        node,
        resolvedInputs: {},
        output: { payload: samplePayload },
        unresolved: [],
        ok: true,
        estimatedMs: estimateNodeMs(node.integration),
        reachable: reachable.has(node.id),
      });
      runtime += estimateNodeMs(node.integration);
      continue;
    }

    const resolvedInputs: Record<string, unknown> = {};
    const unresolved: Array<{ param: string; reason: string }> = [];

    for (const param of Object.keys(node.params).sort()) {
      const result = resolveRef(node.params[param], samplePayload, outputs);
      if (result.found) {
        resolvedInputs[param] = result.value;
      } else {
        unresolved.push({ param, reason: result.reason ?? "unresolved reference" });
      }
    }

    const ok = unresolved.length === 0 && reachable.has(node.id);
    const output = ok ? simulateOutput(node) : null;
    outputs.set(node.id, output);

    const estimatedMs = estimateNodeMs(node.integration);
    runtime += estimatedMs;

    nodes.push({
      node,
      resolvedInputs,
      output,
      unresolved,
      ok,
      estimatedMs,
      reachable: reachable.has(node.id),
    });
  }

  return { samplePayload, nodes, estimatedRuntimeMs: runtime };
}
