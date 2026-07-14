/**
 * 3. Node Validator — every node is individually well-formed.
 *
 * Verifies: each core step has a graph node (and vice versa), retry policy
 * coherent with the error policy, timeout sane, error policy from the closed
 * vocabulary.
 */

import { STEP_ERROR_POLICIES } from "@/lib/workflow";
import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

const MAX_TIMEOUT_MS = 900_000; // 15 min — beyond this a run is not viable
const MAX_ATTEMPTS = 10;

export function validateNodes(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir } = ctx;

  const nodeIds = new Set(ir.graph.nodes.map((n) => n.id));

  // Every core step must have a corresponding graph node.
  for (const step of ir.core.steps) {
    if (!nodeIds.has(step.id)) {
      issues.push({
        code: "NODE_NOT_FOUND",
        severity: "error",
        category: "node",
        message: `Core step "${step.id}" has no matching graph node.`,
        affectedNode: step.id,
        recommendation: "Regenerate the workflow; graph and core are out of sync.",
      });
    }
  }

  // Every action node must have a corresponding core step.
  const coreIds = new Set(ir.core.steps.map((s) => s.id));
  for (const node of ir.graph.nodes) {
    if (node.type === "action" && !coreIds.has(node.id)) {
      issues.push({
        code: "NODE_NOT_FOUND",
        severity: "error",
        category: "node",
        message: `Graph node "${node.id}" has no matching core step.`,
        affectedNode: node.id,
        recommendation: "Regenerate the workflow; graph and core are out of sync.",
      });
    }
  }

  for (const node of ir.graph.nodes) {
    // Retry policy.
    const rp = node.retryPolicy;
    if (!rp || typeof rp.maxAttempts !== "number" || rp.maxAttempts < 1 || rp.maxAttempts > MAX_ATTEMPTS) {
      issues.push({
        code: "INVALID_RETRY_POLICY",
        severity: "error",
        category: "node",
        message: `Node "${node.id}" has an invalid retry policy (maxAttempts must be 1–${MAX_ATTEMPTS}).`,
        affectedNode: node.id,
        recommendation: "Regenerate the workflow to apply a valid retry policy.",
      });
    } else if (node.errorPolicy === "retry" && rp.maxAttempts < 2) {
      issues.push({
        code: "INVALID_RETRY_POLICY",
        severity: "warning",
        category: "node",
        message: `Node "${node.id}" is set to retry but allows only one attempt.`,
        affectedNode: node.id,
        recommendation: `Increase maxAttempts for "${node.id}" or change its error policy.`,
      });
    } else if (node.errorPolicy !== "retry" && rp.maxAttempts > 1) {
      issues.push({
        code: "INVALID_RETRY_POLICY",
        severity: "warning",
        category: "node",
        message: `Node "${node.id}" allows retries but its error policy is "${node.errorPolicy}".`,
        affectedNode: node.id,
        recommendation: `Set "${node.id}" error policy to "retry" or reduce maxAttempts to 1.`,
      });
    }

    // Timeout policy.
    const tp = node.timeoutPolicy;
    if (!tp || typeof tp.timeoutMs !== "number" || tp.timeoutMs <= 0) {
      issues.push({
        code: "INVALID_TIMEOUT_POLICY",
        severity: "error",
        category: "node",
        message: `Node "${node.id}" has no positive timeout.`,
        affectedNode: node.id,
        recommendation: "Regenerate the workflow to apply a valid timeout.",
      });
    } else if (tp.timeoutMs > MAX_TIMEOUT_MS) {
      issues.push({
        code: "INVALID_TIMEOUT_POLICY",
        severity: "warning",
        category: "node",
        message: `Node "${node.id}" timeout of ${tp.timeoutMs}ms exceeds the ${MAX_TIMEOUT_MS}ms guidance.`,
        affectedNode: node.id,
        recommendation: `Lower the timeout for "${node.id}" below ${MAX_TIMEOUT_MS}ms.`,
      });
    }

    // Error policy vocabulary.
    if (!(STEP_ERROR_POLICIES as readonly string[]).includes(node.errorPolicy)) {
      issues.push({
        code: "INVALID_ERROR_POLICY",
        severity: "error",
        category: "node",
        message: `Node "${node.id}" has unknown error policy "${node.errorPolicy}".`,
        affectedNode: node.id,
        recommendation: `Use one of: ${STEP_ERROR_POLICIES.join(", ")}.`,
      });
    }
  }

  return issues;
}
