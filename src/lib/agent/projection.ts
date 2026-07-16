/**
 * Canvas projection — a READ-ONLY VIEW of the canonical Workflow IR.
 *
 * The IR remains the single source of truth. This is a lossy rendering of it
 * for the chat canvas, derived fresh on every emit and never persisted, never
 * edited, and never fed back into the pipeline. It is a view, not a second
 * workflow representation: delete it and nothing about the workflow is lost.
 *
 * Nothing here invents data. Every label, edge and node id comes straight off
 * the IR the Generator produced.
 */

import type { AgentWorkflowIR } from "./models/workflow-ir";

/** Canvas node kinds the chat UI renders. */
export type CanvasNodeType = "trigger" | "process" | "action";

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  label: string;
  detail?: string;
  integration: string | null;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

export interface CanvasWorkflow {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  workflowName: string;
  summary: string;
  /** Which IR revision this view was rendered from. */
  revision: number;
}

/**
 * Map an IR node to a canvas kind.
 *
 * The IR only distinguishes trigger from action; "process" is the canvas's
 * name for the non-terminal transform kinds. Derived from the IR's own `kind`
 * rather than guessed from the label.
 */
function canvasTypeOf(node: AgentWorkflowIR["graph"]["nodes"][number]): CanvasNodeType {
  if (node.type === "trigger") return "trigger";
  return node.kind === "transform" || node.kind === "condition" || node.kind === "delay"
    ? "process"
    : "action";
}

export function projectIRToCanvas(ir: AgentWorkflowIR): CanvasWorkflow {
  const nodes: CanvasNode[] = [...ir.graph.nodes]
    // Render in the IR's own execution order so the canvas reads the way the
    // workflow runs.
    .sort((a, b) => a.executionOrder - b.executionOrder)
    .map((n) => ({
      id: n.id,
      type: canvasTypeOf(n),
      label: n.metadata.label,
      ...(n.metadata.description ? { detail: n.metadata.description } : {}),
      integration: n.integration,
    }));

  return {
    nodes,
    edges: ir.graph.edges.map((e) => ({ id: e.id, source: e.from, target: e.to })),
    workflowName: ir.metadata.name,
    summary: ir.metadata.description,
    revision: ir.revision,
  };
}
