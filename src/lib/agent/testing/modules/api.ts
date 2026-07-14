/**
 * 7. API Connectivity Testing — are the external services reachable?
 *
 * SAFETY: this module never performs a destructive action. It delegates to the
 * injected ApiProbe, whose contract requires read-only / metadata / dry-run
 * endpoints only (e.g. Slack auth.test). The Testing Agent itself issues no
 * integration calls.
 *
 * HONESTY: with the default offline probe nothing is contacted, and the module
 * reports API_NOT_PROBED (info) rather than claiming reachability it never
 * verified.
 */

import type { SupportedIntegration } from "@/lib/workflow";
import type { TestIssue } from "../../models/testing";
import { SLOW_NODE_THRESHOLD_MS } from "../latency";
import type { TestingContext } from "../context";

export async function testApiConnectivity(ctx: TestingContext): Promise<TestIssue[]> {
  const issues: TestIssue[] = [];

  const integrations = new Set<SupportedIntegration>();
  const trigger = ctx.ir.core.trigger;
  if ("integration" in trigger && trigger.integration) integrations.add(trigger.integration);
  for (const step of ctx.ir.core.steps) {
    if (step.integration) integrations.add(step.integration);
  }

  for (const integration of [...integrations].sort()) {
    const affectedNode = ctx.ir.core.steps.find((s) => s.integration === integration)?.id;
    const result = await ctx.apiProbe.check(integration);

    if (!result) {
      issues.push({
        code: "API_NOT_PROBED",
        severity: "info",
        module: "api",
        message: `${integration} reachability was not checked (no API probe configured).`,
        affectedNode,
        recommendation: `Configure an API probe to verify ${integration} connectivity before deploying.`,
      });
      continue;
    }

    if (!result.reachable) {
      issues.push({
        code: "API_UNREACHABLE",
        severity: "error",
        module: "api",
        message: `${integration} is not reachable${result.detail ? `: ${result.detail}` : "."}`,
        affectedNode,
        recommendation: `Check ${integration} status and network access before deploying.`,
      });
      continue;
    }

    if (typeof result.latencyMs === "number" && result.latencyMs >= SLOW_NODE_THRESHOLD_MS) {
      issues.push({
        code: "API_SLOW",
        severity: "warning",
        module: "api",
        message: `${integration} responded in ${result.latencyMs}ms, at or above the ${SLOW_NODE_THRESHOLD_MS}ms threshold.`,
        affectedNode,
        recommendation: `Expect added latency from ${integration}.`,
      });
    }
  }

  return issues;
}
