/**
 * 10. Performance Testing — estimated runtime, slow nodes, long chains,
 * bottlenecks, large payloads.
 *
 * All figures are deterministic ESTIMATES from ../latency.ts. Nothing is timed,
 * because nothing is executed.
 */

import type { TestIssue, TimelineEntry } from "../../models/testing";
import {
  LONG_CHAIN_THRESHOLD,
  SLOW_NODE_THRESHOLD_MS,
  SLOW_WORKFLOW_THRESHOLD_MS,
} from "../latency";
import type { TestingContext } from "../context";

/** Payload bytes above which serialization/transfer becomes a concern. */
const LARGE_PAYLOAD_BYTES = 64 * 1024;

export interface PerformanceOutput {
  issues: TestIssue[];
  timeline: TimelineEntry[];
  estimatedRuntimeMs: number;
}

export function testPerformance(ctx: TestingContext): PerformanceOutput {
  const issues: TestIssue[] = [];
  const timeline: TimelineEntry[] = [];

  let cursor = 0;
  for (const sim of ctx.simulation.nodes) {
    const start = cursor;
    const end = cursor + sim.estimatedMs;
    timeline.push({
      order: sim.node.executionOrder,
      nodeId: sim.node.id,
      startMs: start,
      endMs: end,
      estimatedMs: sim.estimatedMs,
    });
    cursor = end;

    if (sim.node.type !== "trigger" && sim.estimatedMs >= SLOW_NODE_THRESHOLD_MS) {
      issues.push({
        code: "SLOW_NODE",
        severity: "warning",
        module: "performance",
        message: `Node "${sim.node.id}" (${sim.node.integration}) is estimated at ${sim.estimatedMs}ms — a likely bottleneck.`,
        affectedNode: sim.node.id,
        recommendation: `Expect latency from "${sim.node.id}"; move it off the critical path if possible.`,
      });
    }
  }

  const estimatedRuntimeMs = cursor;

  if (ctx.ir.graph.nodes.length > LONG_CHAIN_THRESHOLD) {
    issues.push({
      code: "LONG_CHAIN",
      severity: "warning",
      module: "performance",
      message: `The workflow runs ${ctx.ir.graph.nodes.length} sequential nodes, increasing latency and failure surface.`,
      recommendation: "Consider merging or parallelizing steps.",
    });
  }

  if (estimatedRuntimeMs > SLOW_WORKFLOW_THRESHOLD_MS) {
    issues.push({
      code: "SLOW_NODE",
      severity: "warning",
      module: "performance",
      message: `Estimated end-to-end runtime is ${estimatedRuntimeMs}ms, above the ${SLOW_WORKFLOW_THRESHOLD_MS}ms guidance.`,
      recommendation: "Shorten the workflow or move slow work off the critical path.",
    });
  }

  const payloadBytes = JSON.stringify(ctx.simulation.samplePayload).length;
  if (payloadBytes > LARGE_PAYLOAD_BYTES) {
    issues.push({
      code: "LARGE_PAYLOAD",
      severity: "warning",
      module: "performance",
      message: `The trigger payload is ~${payloadBytes} bytes, above the ${LARGE_PAYLOAD_BYTES}-byte guidance.`,
      affectedNode: "trigger",
      recommendation: "Trim the payload to the fields the workflow actually uses.",
    });
  }

  return { issues, timeline, estimatedRuntimeMs };
}
