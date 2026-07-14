/**
 * 8. Retry Testing — retry policy is coherent with what each node does.
 *
 * External writes over a network should retry; notifications may continue;
 * financial calls must not silently retry into duplicate charges.
 */

import type { SupportedIntegration } from "@/lib/workflow";
import type { TestIssue } from "../../models/testing";
import type { TestingContext } from "../context";

/** Network-backed writes where a transient failure is expected occasionally. */
const FLAKY_INTEGRATIONS = new Set<SupportedIntegration>([
  "sheets",
  "google",
  "hubspot",
  "salesforce",
  "crm",
]);

/** Money movement: a blind retry risks a duplicate charge. */
const FINANCIAL = new Set<SupportedIntegration>(["stripe", "razorpay"]);

export function testRetry(ctx: TestingContext): TestIssue[] {
  const issues: TestIssue[] = [];

  for (const node of ctx.ir.graph.nodes) {
    if (node.type === "trigger" || !node.integration) continue;

    const attempts = node.retryPolicy.maxAttempts;

    if (FLAKY_INTEGRATIONS.has(node.integration) && node.errorPolicy !== "retry") {
      issues.push({
        code: "NO_RETRY_ON_FLAKY",
        severity: "warning",
        module: "retry",
        message: `Node "${node.id}" calls ${node.integration} (network write) with error policy "${node.errorPolicy}" and no retries.`,
        affectedNode: node.id,
        recommendation: `Enable retry on "${node.id}" so transient ${node.integration} failures recover.`,
      });
    }

    if (FINANCIAL.has(node.integration) && node.errorPolicy === "retry") {
      issues.push({
        code: "CONTINUE_ON_CRITICAL",
        severity: "warning",
        module: "retry",
        message: `Node "${node.id}" retries a ${node.integration} operation; without idempotency this risks duplicate charges.`,
        affectedNode: node.id,
        recommendation: `Ensure "${node.id}" is idempotent, or set its error policy to "fail".`,
      });
    }

    if (node.errorPolicy === "retry" && attempts < 2) {
      issues.push({
        code: "NO_RETRY_ON_FLAKY",
        severity: "warning",
        module: "retry",
        message: `Node "${node.id}" is set to retry but allows only ${attempts} attempt.`,
        affectedNode: node.id,
        recommendation: `Raise maxAttempts for "${node.id}" above 1.`,
      });
    }
  }

  return issues;
}
