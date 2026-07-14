/**
 * Workflow Compiler — AgentWorkflowIR → executable n8n workflow JSON.
 *
 * REUSE, NOT REIMPLEMENTATION: the IR→n8n node/connection mapping already
 * exists and is catalog-driven (`adapters/n8n/compiler`). This compiler calls
 * it and then applies what that layer does not carry: the IR's per-node
 * resilience policy and the workflow timeout budget.
 *
 * Guarantees:
 *   - Deterministic: same IR + same credential attachments ⇒ byte-identical
 *     n8n JSON (no wall-clock, no random, no ordering drift).
 *   - Never invents nodes or parameters — every node comes from the IR via the
 *     catalog-bound step mapper.
 *   - Never mutates the IR (works on the compiled output only).
 */

import { compileWorkflowToN8n } from "@/lib/adapters/n8n/compiler/compile";
import { N8N_TRIGGER_NODE_NAME } from "@/lib/adapters/n8n/compiler/trigger-mapper";
import type { CredentialAttachmentMap } from "@/lib/adapters/n8n/credentials/mapper";
import type { N8nNode, N8nWorkflow } from "@/lib/adapters/n8n/client/types";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { DeploymentIssue } from "../models/deployment";

export interface CompileResult {
  workflow: N8nWorkflow;
  warnings: DeploymentIssue[];
}

export class CompilationError extends Error {
  constructor(
    readonly reason: string,
    readonly cause?: unknown,
  ) {
    super(`Workflow compilation failed: ${reason}`);
    this.name = "CompilationError";
  }
}

/**
 * Compile an IR document into deployable n8n JSON.
 *
 * @param attachments n8n credential rows keyed by credential TYPE, produced by
 *   the credential mapper. Omit for a pure compile (e.g. determinism tests).
 */
export function compileIrToN8n(
  ir: AgentWorkflowIR,
  attachments?: CredentialAttachmentMap,
): CompileResult {
  const warnings: DeploymentIssue[] = [];

  let workflow: N8nWorkflow;
  try {
    workflow = compileWorkflowToN8n(ir.core, {
      ...(attachments ? { credentialAttachments: attachments } : {}),
    });
  } catch (err) {
    throw new CompilationError(
      err instanceof Error ? err.message : String(err),
      err,
    );
  }

  /* ── Carry the IR's resilience policy onto the n8n nodes ───── */
  const nodeById = new Map(ir.graph.nodes.map((n) => [n.id, n]));
  for (const node of workflow.nodes) {
    if (node.name === N8N_TRIGGER_NODE_NAME) continue;

    // The step mapper names each n8n node after the IR step id.
    const irNode = nodeById.get(node.name);
    if (!irNode) {
      warnings.push({
        code: "COMPILATION_FAILED",
        severity: "warning",
        message: `Compiled node "${node.name}" has no matching IR node; its retry/error policy could not be applied.`,
        affectedNode: node.name,
        recommendation: "Regenerate the workflow; the IR graph and core disagree.",
      });
      continue;
    }
    applyPolicy(node, irNode.errorPolicy, irNode.retryPolicy);
  }

  /* ── Workflow-level timeout budget ─────────────────────────── */
  // n8n has no per-node timeout; the IR's workflow budget maps to the
  // workflow-level setting (n8n expects SECONDS).
  const timeoutSeconds = Math.max(
    1,
    Math.ceil(ir.core.steps.length > 0 ? deriveTimeoutMs(ir) / 1000 : 60),
  );
  workflow.settings = {
    ...(workflow.settings ?? {}),
    executionTimeout: timeoutSeconds,
  };

  // Surface the per-node timeouts we could not express.
  const perNodeTimeouts = new Set(
    ir.graph.nodes
      .filter((n) => n.type === "action")
      .map((n) => n.timeoutPolicy.timeoutMs),
  );
  if (perNodeTimeouts.size > 1) {
    warnings.push({
      code: "COMPILATION_FAILED",
      severity: "warning",
      message:
        "The IR declares per-node timeouts, but n8n only supports a workflow-level timeout; the workflow budget was used instead.",
      recommendation:
        "Expect timeout enforcement at the workflow level rather than per node.",
    });
  }

  return { workflow, warnings };
}

/** Map the IR error/retry policy onto n8n's node fields. */
function applyPolicy(
  node: N8nNode,
  errorPolicy: "fail" | "continue" | "retry",
  retryPolicy: { maxAttempts: number; backoff: string; baseDelayMs: number },
): void {
  switch (errorPolicy) {
    case "retry":
      node.retryOnFail = true;
      node.maxTries = retryPolicy.maxAttempts;
      node.waitBetweenTries = retryPolicy.baseDelayMs;
      // Once retries are exhausted the run must stop — a silently swallowed
      // write is worse than a visible failure.
      node.onError = "stopWorkflow";
      break;
    case "continue":
      node.retryOnFail = false;
      node.onError = "continueRegularOutput";
      break;
    case "fail":
    default:
      node.retryOnFail = false;
      node.onError = "stopWorkflow";
      break;
  }
}

/** Workflow timeout budget from the IR, falling back to a safe default. */
function deriveTimeoutMs(ir: AgentWorkflowIR): number {
  const perNodeSum = ir.graph.nodes.reduce(
    (sum, n) => sum + n.timeoutPolicy.timeoutMs,
    0,
  );
  return perNodeSum > 0 ? perNodeSum : 60_000;
}
