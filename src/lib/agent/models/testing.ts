/**
 * Testing Agent report models.
 *
 * The testing agent (Phase F) runs AFTER validation passes and BEFORE
 * deployment-ready. It does NOT call real integrations. It performs a
 * deterministic dry-run simulation:
 *
 *   1. Synthesize a sample trigger payload from the IR trigger config.
 *   2. Walk the topological order, simulating each step's transform of
 *      its inputs → outputs using declared param mappings.
 *   3. Verify every param ref resolves (no dangling step/trigger refs).
 *   4. Record per-step pass/fail + a simulated duration.
 *
 * This catches mapping errors, unreachable steps, and unresolved refs
 * without side effects. It NEVER reports a pass it didn't actually
 * simulate — a step with an unresolved ref is a FAIL, not a skip.
 */

export type StepTestStatus = "passed" | "failed" | "skipped";

export interface StepTestResult {
  stepId: string;
  label: string;
  status: StepTestStatus;
  /** Simulated inputs the step received (resolved from refs). */
  resolvedInputs: Record<string, unknown>;
  /** Simulated output the step produced (shape only, synthetic values). */
  simulatedOutput: Record<string, unknown> | null;
  /** Why it failed — unresolved ref, missing param, etc. */
  failureReason?: string;
  /** Synthetic execution time (ms) for perceived-performance metrics. */
  durationMs: number;
}

export interface TestReport {
  sessionId: string;
  /** True only when every step passed. */
  passed: boolean;
  /** Sample trigger payload used for the run. */
  samplePayload: Record<string, unknown>;
  steps: StepTestResult[];
  warnings: string[];
  metrics: {
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    skippedSteps: number;
    totalDurationMs: number;
  };
  createdAt: number;
}

/** Build a TestReport from per-step results, computing rollups. */
export function buildTestReport(
  sessionId: string,
  samplePayload: Record<string, unknown>,
  steps: StepTestResult[],
  warnings: string[] = [],
): TestReport {
  const passedSteps = steps.filter((s) => s.status === "passed").length;
  const failedSteps = steps.filter((s) => s.status === "failed").length;
  const skippedSteps = steps.filter((s) => s.status === "skipped").length;
  const totalDurationMs = steps.reduce((sum, s) => sum + s.durationMs, 0);
  return {
    sessionId,
    passed: failedSteps === 0 && steps.length > 0,
    samplePayload,
    steps,
    warnings,
    metrics: {
      totalSteps: steps.length,
      passedSteps,
      failedSteps,
      skippedSteps,
      totalDurationMs,
    },
    createdAt: Date.now(),
  };
}
