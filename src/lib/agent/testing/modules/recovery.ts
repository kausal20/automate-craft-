/**
 * 11. Failure Recovery Testing — what happens when a node fails mid-run.
 *
 * Simulates each node failing in turn (in-memory, nothing executed) and reports
 * whether the workflow degrades acceptably: does the failure abort the run, is
 * a continue-on-error safe, do downstream nodes depend on output that would
 * never arrive?
 */

import type { SupportedIntegration } from "@/lib/workflow";
import type { TestIssue } from "../../models/testing";
import type { TestingContext } from "../context";

/** Failing silently here would corrupt data or lose money. */
const CRITICAL_INTEGRATIONS = new Set<SupportedIntegration>([
  "stripe",
  "razorpay",
  "hubspot",
  "salesforce",
  "crm",
  "sheets",
]);

export function testFailureRecovery(ctx: TestingContext): TestIssue[] {
  const issues: TestIssue[] = [];

  const downstreamOf = new Map<string, string[]>();
  for (const e of ctx.ir.graph.edges) {
    if (!downstreamOf.has(e.from)) downstreamOf.set(e.from, []);
    downstreamOf.get(e.from)!.push(e.to);
  }

  for (const node of ctx.ir.graph.nodes) {
    if (node.type === "trigger" || !node.integration) continue;

    // continue-on-error over a critical write loses data silently.
    if (node.errorPolicy === "continue" && CRITICAL_INTEGRATIONS.has(node.integration)) {
      issues.push({
        code: "CONTINUE_ON_CRITICAL",
        severity: "warning",
        module: "recovery",
        message: `Node "${node.id}" writes to ${node.integration} but continues on error — a failure would be silently ignored.`,
        affectedNode: node.id,
        recommendation: `Set "${node.id}" error policy to "fail" or "retry" so write failures surface.`,
      });
    }

    // Simulated failure: does anything downstream read this node's output?
    const consumers = ctx.ir.mappings.filter(
      (m) => m.source === "step" && m.ref?.startsWith(`${node.id}.`),
    );
    if (node.errorPolicy === "continue" && consumers.length > 0) {
      const consumerNodes = [...new Set(consumers.map((c) => c.nodeId))];
      issues.push({
        code: "NO_FALLBACK_PATH",
        severity: "error",
        module: "recovery",
        message: `Node "${node.id}" continues on error, but ${consumerNodes.join(", ")} read its output — they would receive nothing.`,
        affectedNode: node.id,
        recommendation: `Set "${node.id}" to "fail"/"retry", or give ${consumerNodes.join(", ")} a fallback value.`,
      });
    }

    // A failing terminal node with "fail" policy simply ends the run — fine.
    // A failing mid-chain node with "fail" aborts everything after it: report
    // as info so the blast radius is visible.
    const downstream = downstreamOf.get(node.id) ?? [];
    if (node.errorPolicy === "fail" && downstream.length > 0) {
      issues.push({
        code: "NO_FALLBACK_PATH",
        severity: "info",
        module: "recovery",
        message: `If "${node.id}" fails, the run aborts and ${downstream.join(", ")} will not execute.`,
        affectedNode: node.id,
        recommendation: `Accept this blast radius, or make "${node.id}" retry.`,
      });
    }
  }

  return issues;
}
