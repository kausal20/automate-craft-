/**
 * TestingAgent — composes the twelve single-responsibility test modules.
 *
 * Pipeline (fixed, deterministic order):
 *   execution simulation → trigger → node → variable → mapping → credential
 *   → api → retry → timeout → performance → recovery → readiness
 *
 * Rules:
 *   - NEVER deploys. NEVER mutates the IR (the context is read-only).
 *   - NEVER performs a destructive call. Live checks only happen through the
 *     injected probes, which are contractually read-only/metadata-level.
 *   - Collect-all: every module runs and reports everything it finds.
 *   - Honest coverage: a module whose live probe is absent reports SKIPPED with
 *     a reason — never PASS for a check that did not run.
 *   - Deterministic by default: the simulation and every timing figure are
 *     static estimates, and `createdAt` is injectable.
 */

import type { TestingAgent } from "../interfaces";
import type { KnownConnection } from "../models/session";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { ValidationReport } from "../models/validation";
import {
  buildTestReport,
  type ModuleResult,
  type TestIssue,
  type TestModule,
  type TestReport,
  type TestStatus,
} from "../models/testing";
import type { TestingContext } from "./context";
import {
  offlineApiProbe,
  offlineCredentialProbe,
  type ApiProbe,
  type CredentialProbe,
} from "./probes";
import { simulate } from "./modules/simulator";
import { testTrigger } from "./modules/trigger";
import { testNodes } from "./modules/node";
import { testVariables } from "./modules/variable";
import { testMappings } from "./modules/mapping";
import { testCredentials } from "./modules/credential";
import { testApiConnectivity } from "./modules/api";
import { testRetry } from "./modules/retry";
import { testTimeouts } from "./modules/timeout";
import { testPerformance } from "./modules/performance";
import { testFailureRecovery } from "./modules/recovery";
import { testDeploymentReadiness } from "./modules/readiness";

/**
 * Derive a module's status from its own issues.
 * A module that produced a "not probed" info issue is SKIPPED, not PASS —
 * we never claim coverage we didn't have.
 */
function moduleResultFrom(
  module: TestModule,
  issues: readonly TestIssue[],
  options: { unitCount: number },
): ModuleResult {
  const mine = issues.filter((i) => i.module === module);
  const failed = mine.filter((i) => i.severity === "error").length;
  const warnings = mine.filter((i) => i.severity === "warning").length;

  const notProbed = mine.find(
    (i) => i.code === "CREDENTIAL_NOT_PROBED" || i.code === "API_NOT_PROBED",
  );

  let status: TestStatus;
  let note: string | undefined;
  if (failed > 0) {
    status = "FAIL";
  } else if (warnings > 0) {
    status = "WARNING";
  } else if (notProbed) {
    status = "SKIPPED";
    note = notProbed.message;
  } else if (options.unitCount === 0) {
    status = "SKIPPED";
    note = "Nothing to check for this workflow.";
  } else {
    status = "PASS";
  }

  return {
    module,
    status,
    passed: status === "PASS" ? options.unitCount : 0,
    failed,
    warnings,
    ...(note ? { note } : {}),
  };
}

class WorkflowTestingAgent implements TestingAgent {
  async test(input: {
    sessionId: string;
    userId: string;
    ir: AgentWorkflowIR;
    validation: ValidationReport | null;
    knownConnections: KnownConnection[];
    apiProbe?: ApiProbe;
    credentialProbe?: CredentialProbe;
    createdAt?: number;
  }): Promise<TestReport> {
    /* ── 1. Execution simulation (drives every other module) ──── */
    const simulation = simulate(input.ir);

    const ctx: TestingContext = {
      sessionId: input.sessionId,
      userId: input.userId,
      ir: input.ir,
      validation: input.validation,
      knownConnections: input.knownConnections,
      apiProbe: input.apiProbe ?? offlineApiProbe,
      credentialProbe: input.credentialProbe ?? offlineCredentialProbe,
      simulation,
    };

    const issues: TestIssue[] = [];
    const modules: ModuleResult[] = [];

    const actionNodes = ctx.ir.graph.nodes.filter((n) => n.type === "action");
    const credentialledIntegrations = ctx.ir.connections.length;

    /* ── 2. Execution ─────────────────────────────────────────── */
    // Per-node verdicts belong to the node module. Execution answers one
    // question: did the simulation actually walk a workflow end-to-end?
    if (simulation.nodes.length === 0) {
      issues.push({
        code: "NODE_SIMULATION_FAILED",
        severity: "error",
        module: "execution",
        message: "The workflow has no nodes to simulate.",
        recommendation: "Regenerate the workflow; there is nothing to execute.",
      });
    }
    modules.push(
      moduleResultFrom("execution", issues, { unitCount: simulation.nodes.length }),
    );

    /* ── 3. Trigger ───────────────────────────────────────────── */
    issues.push(...testTrigger(ctx));
    modules.push(moduleResultFrom("trigger", issues, { unitCount: 1 }));

    /* ── 4. Node ──────────────────────────────────────────────── */
    const nodeOutput = testNodes(ctx);
    issues.push(...nodeOutput.issues);
    modules.push(
      moduleResultFrom("node", issues, { unitCount: actionNodes.length }),
    );

    /* ── 5. Variable ──────────────────────────────────────────── */
    issues.push(...testVariables(ctx));
    modules.push(
      moduleResultFrom("variable", issues, { unitCount: ctx.ir.variables.length }),
    );

    /* ── 6. Mapping ───────────────────────────────────────────── */
    issues.push(...testMappings(ctx));
    modules.push(
      moduleResultFrom("mapping", issues, { unitCount: ctx.ir.mappings.length }),
    );

    /* ── 7. Credential (live probe or SKIPPED) ────────────────── */
    issues.push(...(await testCredentials(ctx)));
    modules.push(
      moduleResultFrom("credential", issues, { unitCount: credentialledIntegrations }),
    );

    /* ── 8. API connectivity (live probe or SKIPPED) ──────────── */
    issues.push(...(await testApiConnectivity(ctx)));
    modules.push(
      moduleResultFrom("api", issues, { unitCount: credentialledIntegrations }),
    );

    /* ── 9. Retry ─────────────────────────────────────────────── */
    issues.push(...testRetry(ctx));
    modules.push(moduleResultFrom("retry", issues, { unitCount: actionNodes.length }));

    /* ── 10. Timeout ──────────────────────────────────────────── */
    issues.push(...testTimeouts(ctx));
    modules.push(
      moduleResultFrom("timeout", issues, { unitCount: ctx.ir.graph.nodes.length }),
    );

    /* ── 11. Performance ──────────────────────────────────────── */
    const perf = testPerformance(ctx);
    issues.push(...perf.issues);
    modules.push(
      moduleResultFrom("performance", issues, { unitCount: ctx.ir.graph.nodes.length }),
    );

    /* ── 12. Failure recovery ─────────────────────────────────── */
    issues.push(...testFailureRecovery(ctx));
    modules.push(
      moduleResultFrom("recovery", issues, { unitCount: actionNodes.length }),
    );

    /* ── 13. Readiness (sees everything above) ────────────────── */
    issues.push(...testDeploymentReadiness(ctx, issues));
    modules.push(moduleResultFrom("readiness", issues, { unitCount: 1 }));

    return buildTestReport({
      sessionId: input.sessionId,
      irRevision: input.ir.revision,
      samplePayload: simulation.samplePayload,
      nodes: nodeOutput.results,
      modules,
      issues,
      timeline: perf.timeline,
      estimatedRuntimeMs: perf.estimatedRuntimeMs,
      createdAt: input.createdAt ?? Date.now(),
    });
  }
}

export const workflowTestingAgent: TestingAgent = new WorkflowTestingAgent();
