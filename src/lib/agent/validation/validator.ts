/**
 * ValidatorAgent — composes the eleven single-responsibility validators.
 *
 * Pipeline (fixed, deterministic order):
 *   structure → schema → node → edge → dependency → variable → parameter
 *   → credential → integration → execution → deployment readiness
 *
 * Rules:
 *   - INSPECT ONLY. The IR is never modified (context is read-only).
 *   - Collect-all: every validator runs and reports everything it finds, so a
 *     single report lists all problems rather than only the first.
 *   - Deployment readiness runs last and sees the other ten's findings.
 *   - Deterministic: fixed stage order, no wall-clock in logic. `createdAt` is
 *     supplied by the caller.
 */

import type { PlanTier } from "@/lib/workflow";
import type { ValidatorAgent } from "../interfaces";
import type { KnownConnection } from "../models/session";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import {
  buildValidationReport,
  type ValidationIssue,
  type ValidationReport,
} from "../models/validation";
import type { ValidatorContext } from "./context";
import { validateStructure } from "./validators/structure";
import { validateSchema } from "./validators/schema";
import { validateNodes } from "./validators/node";
import { validateEdges } from "./validators/edge";
import { validateDependencies } from "./validators/dependency";
import { validateVariables } from "./validators/variable";
import { validateParameters } from "./validators/parameter";
import { validateCredentials } from "./validators/credential";
import { validateIntegrations } from "./validators/integration";
import { validateExecution } from "./validators/execution";
import { validateDeploymentReadiness } from "./validators/deployment";

/** The ten independent stages, in pipeline order. */
const STAGES: Array<(ctx: ValidatorContext) => ValidationIssue[]> = [
  validateStructure,
  validateSchema,
  validateNodes,
  validateEdges,
  validateDependencies,
  validateVariables,
  validateParameters,
  validateCredentials,
  validateIntegrations,
  validateExecution,
];

class WorkflowValidatorAgent implements ValidatorAgent {
  validate(input: {
    sessionId: string;
    ir: AgentWorkflowIR;
    knownConnections: KnownConnection[];
    plan?: PlanTier;
    createdAt?: number;
  }): ValidationReport {
    const ctx: ValidatorContext = {
      ir: input.ir,
      knownConnections: input.knownConnections,
      plan: input.plan ?? "starter",
    };

    const issues: ValidationIssue[] = [];
    for (const stage of STAGES) {
      issues.push(...stage(ctx));
    }

    // Readiness gate sees everything the other stages found.
    issues.push(...validateDeploymentReadiness(ctx, issues));

    return buildValidationReport(input.sessionId, issues, {
      irRevision: input.ir.revision,
      createdAt: input.createdAt ?? Date.now(),
    });
  }
}

export const workflowValidator: ValidatorAgent = new WorkflowValidatorAgent();
