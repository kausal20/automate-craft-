/**
 * 9. Timeout Testing — each node's timeout can accommodate its own work,
 * including retries, without hanging a run.
 */

import type { TestIssue } from "../../models/testing";
import { estimateNodeMs } from "../latency";
import type { TestingContext } from "../context";

/** A timeout must leave headroom over the expected call time. */
const HEADROOM_FACTOR = 2;

/** Beyond this a hung node blocks the run for too long. */
const MAX_REASONABLE_TIMEOUT_MS = 300_000;

export function testTimeouts(ctx: TestingContext): TestIssue[] {
  const issues: TestIssue[] = [];

  for (const node of ctx.ir.graph.nodes) {
    if (node.type === "trigger") continue;

    const timeout = node.timeoutPolicy.timeoutMs;
    const expected = estimateNodeMs(node.integration);
    const attempts = node.errorPolicy === "retry" ? node.retryPolicy.maxAttempts : 1;

    if (timeout < expected * HEADROOM_FACTOR) {
      issues.push({
        code: "TIMEOUT_TOO_LOW",
        severity: "warning",
        module: "timeout",
        message: `Node "${node.id}" allows ${timeout}ms but ${node.integration} typically needs ~${expected}ms; it may time out spuriously.`,
        affectedNode: node.id,
        recommendation: `Raise the timeout for "${node.id}" to at least ${expected * HEADROOM_FACTOR}ms.`,
      });
    }

    if (timeout > MAX_REASONABLE_TIMEOUT_MS) {
      issues.push({
        code: "TIMEOUT_TOO_HIGH",
        severity: "warning",
        module: "timeout",
        message: `Node "${node.id}" can hang for up to ${timeout}ms.`,
        affectedNode: node.id,
        recommendation: `Lower the timeout for "${node.id}" below ${MAX_REASONABLE_TIMEOUT_MS}ms.`,
      });
    }

    // Worst case with retries must stay within the workflow budget.
    const worstCase = timeout * attempts;
    if (worstCase > MAX_REASONABLE_TIMEOUT_MS) {
      issues.push({
        code: "TIMEOUT_TOO_HIGH",
        severity: "warning",
        module: "timeout",
        message: `Node "${node.id}" worst case is ${worstCase}ms (${attempts} attempts × ${timeout}ms).`,
        affectedNode: node.id,
        recommendation: `Reduce retries or timeout on "${node.id}".`,
      });
    }
  }

  return issues;
}
