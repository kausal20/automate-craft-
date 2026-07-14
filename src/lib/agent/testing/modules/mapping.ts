/**
 * 5. Mapping Testing — every declared mapping resolved during the run.
 *
 * The Validator checks mappings statically; this module checks that they
 * actually delivered a value in the simulation, and that every required param
 * of every node was filled.
 */

import { lookupOperation } from "@/lib/workflow";
import type { TestIssue } from "../../models/testing";
import type { TestingContext } from "../context";

export function testMappings(ctx: TestingContext): TestIssue[] {
  const issues: TestIssue[] = [];
  const simByNode = new Map(ctx.simulation.nodes.map((n) => [n.node.id, n]));

  for (const m of ctx.ir.mappings) {
    const sim = simByNode.get(m.nodeId);
    if (!sim) {
      issues.push({
        code: "BROKEN_MAPPING",
        severity: "error",
        module: "mapping",
        message: `Mapping "${m.id}" targets node "${m.nodeId}", which is not in the graph.`,
        affectedNode: m.nodeId,
        recommendation: "Regenerate the workflow; the mapping points at a missing node.",
      });
      continue;
    }

    const failed = sim.unresolved.find((u) => u.param === m.param);
    if (failed) {
      issues.push({
        code: "BROKEN_MAPPING",
        severity: "error",
        module: "mapping",
        message: `Mapping "${m.id}" (${m.source} → ${m.nodeId}.${m.param}) did not resolve: ${failed.reason}.`,
        affectedNode: m.nodeId,
        recommendation: `Fix the source of "${m.param}" on "${m.nodeId}".`,
      });
    }
  }

  // Every catalog-required param must have arrived.
  for (const step of ctx.ir.core.steps) {
    const def = lookupOperation(step.integration ?? null, step.operation);
    if (!def) continue; // unsupported operations are the Validator's concern
    const sim = simByNode.get(step.id);
    if (!sim || !sim.reachable) continue;

    for (const required of def.requiredParams) {
      const arrived = required in sim.resolvedInputs;
      const declared = required in step.params;
      if (!arrived && !declared) {
        issues.push({
          code: "MISSING_REQUIRED_PARAM",
          severity: "error",
          module: "mapping",
          message: `Node "${step.id}" never received required parameter "${required}".`,
          affectedNode: step.id,
          recommendation: `Map "${required}" for ${step.integration ?? "builtin"}.${step.operation}.`,
        });
      }
    }
  }

  return issues;
}
