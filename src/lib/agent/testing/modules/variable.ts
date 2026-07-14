/**
 * 4. Variable Testing — variables exist, are typed, and actually carry values
 * through the simulated run.
 *
 * Distinct from the Validator's static variable checks: this module verifies
 * the variables against the SIMULATION (did a real synthetic value arrive?),
 * not just the declaration.
 */

import type { TestIssue } from "../../models/testing";
import type { IRVariableType } from "../../models/workflow-ir";
import type { TestingContext } from "../context";

const VALID_TYPES: IRVariableType[] = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "unknown",
];

/** Runtime type of a synthetic value, mapped to the IR type vocabulary. */
function actualType(value: unknown): IRVariableType {
  if (value === null || value === undefined) return "unknown";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "object") return "object";
  return "unknown";
}

export function testVariables(ctx: TestingContext): TestIssue[] {
  const issues: TestIssue[] = [];
  const nodeIds = new Set(ctx.ir.graph.nodes.map((n) => n.id));

  for (const v of ctx.ir.variables) {
    if (!VALID_TYPES.includes(v.type)) {
      issues.push({
        code: "TYPE_MISMATCH",
        severity: "error",
        module: "variable",
        message: `Variable "${v.id}" declares unknown type "${v.type}".`,
        affectedNode: v.producedBy,
        recommendation: `Use one of: ${VALID_TYPES.join(", ")}.`,
      });
    }

    if (!nodeIds.has(v.producedBy)) {
      issues.push({
        code: "MISSING_OUTPUT",
        severity: "error",
        module: "variable",
        message: `Variable "${v.id}" is produced by "${v.producedBy}", which is not a node in the graph.`,
        affectedNode: v.producedBy,
        recommendation: `Remove "${v.id}" or restore node "${v.producedBy}".`,
      });
      continue;
    }

    // The producing node must actually emit the variable's path in the run.
    const producer = ctx.simulation.nodes.find((n) => n.node.id === v.producedBy);
    if (!producer) continue;

    // Trigger variables live under the sample payload; step variables under the
    // node's simulated output.
    const source =
      v.producedBy === "trigger"
        ? (ctx.simulation.samplePayload as unknown)
        : (producer.output as unknown);

    if (source === null) {
      issues.push({
        code: "MISSING_OUTPUT",
        severity: "error",
        module: "variable",
        message: `Variable "${v.id}" expects output from "${v.producedBy}", but that node produced none in the simulation.`,
        affectedNode: v.producedBy,
        recommendation: `Fix "${v.producedBy}" so it produces output before it is read.`,
      });
      continue;
    }

    const resolved = readPath(source, v.path);
    if (!resolved.found) {
      issues.push({
        code: "DANGLING_VARIABLE",
        severity: "error",
        module: "variable",
        message: `Variable "${v.id}" reads "${v.path}" from "${v.producedBy}", which is not present in the simulated run.`,
        affectedNode: v.producedBy,
        recommendation: `Ensure "${v.producedBy}" emits "${v.path}".`,
      });
      continue;
    }

    // Declared type vs the type actually carried.
    const observed = actualType(resolved.value);
    if (v.type !== "unknown" && observed !== "unknown" && observed !== v.type) {
      issues.push({
        code: "TYPE_MISMATCH",
        severity: "warning",
        module: "variable",
        message: `Variable "${v.id}" is declared "${v.type}" but carries a ${observed} in the simulated run.`,
        affectedNode: v.producedBy,
        recommendation: `Confirm the declared type of "${v.path}".`,
      });
    }
  }

  return issues;
}

function readPath(source: unknown, path: string): { found: boolean; value: unknown } {
  let cursor: unknown = source;
  for (const key of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null || !(key in (cursor as object))) {
      return { found: false, value: undefined };
    }
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return { found: true, value: cursor };
}
