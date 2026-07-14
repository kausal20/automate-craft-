/**
 * DeploymentAgent — compile → upload → verify → activate → report.
 *
 * Never modifies the Workflow IR (it is read, never written). Never invents
 * nodes or credential ids. Every failure returns a structured DeploymentReport
 * rather than throwing, so the caller always gets an auditable outcome.
 *
 * ROLLBACK: if a create/update lands but a later step fails, the agent undoes
 * what it did — deactivating and removing a workflow it created, or restoring
 * the previous revision's activation state on an update. A rollback that itself
 * fails is reported honestly (status PARTIAL) rather than silently swallowed.
 *
 * DETERMINISM: deployment is a live action, so a DeploymentReport carries real
 * wall-clock duration and externally-assigned ids — it is deliberately NOT
 * byte-deterministic. The COMPILER is (see compiler.ts), and that is where
 * determinism is asserted.
 */

import type { DeploymentAgent } from "../interfaces";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { ValidationReport } from "../models/validation";
import type { TestReport } from "../models/testing";
import {
  buildDeploymentReport,
  type ActivationStatus,
  type DeploymentIssue,
  type DeploymentOperation,
  type DeploymentReport,
  type RollbackReport,
} from "../models/deployment";
import { compileIrToN8n, CompilationError } from "./compiler";
import { resolveCredentials, type CredentialResolver } from "./credentials";
import {
  liveN8nDeploymentClient,
  type N8nDeploymentClient,
} from "./client";

/** Previous deployment state, used to restore on a failed update. */
export interface PreviousDeployment {
  workflowId: string;
  revision: number;
  active: boolean;
}

interface DeployInput {
  sessionId: string;
  userId: string;
  ir: AgentWorkflowIR;
  validation: ValidationReport | null;
  test: TestReport | null;
  /** Existing n8n workflow to update. Absent ⇒ create. */
  previous?: PreviousDeployment | null;
  client?: N8nDeploymentClient;
  /** Overrides live vault resolution. Defaults to `resolveCredentials`. */
  credentialResolver?: CredentialResolver;
  /** Injected for deterministic tests; production uses wall-clock. */
  now?: () => number;
  deploymentId?: string;
}

/** Classify a thrown client error into a structured code. */
function classify(err: unknown): { code: DeploymentIssue["code"]; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  const lower = `${name} ${message}`.toLowerCase();

  if (name === "N8nNotConfiguredError" || lower.includes("not configured")) {
    return { code: "NOT_CONFIGURED", message };
  }
  if (lower.includes("401") || lower.includes("403") || lower.includes("unauthor")) {
    return { code: "AUTHENTICATION_FAILED", message };
  }
  if (lower.includes("abort") || lower.includes("etimedout") || lower.includes("timeout")) {
    return { code: "TIMEOUT", message };
  }
  if (
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("fetch failed")
  ) {
    return { code: "NETWORK_FAILURE", message };
  }
  return { code: "API_FAILURE", message };
}

class N8nDeploymentAgent implements DeploymentAgent {
  async deploy(input: DeployInput): Promise<DeploymentReport> {
    const client = input.client ?? liveN8nDeploymentClient;
    const now = input.now ?? (() => Date.now());
    const startedAt = now();
    const deploymentId = input.deploymentId ?? `dep_${input.ir.revision}_${startedAt.toString(36)}`;
    const operation: DeploymentOperation = input.previous ? "UPDATE" : "CREATE";

    const issues: DeploymentIssue[] = [];
    const finish = (o: {
      workflowId: string | null;
      activationStatus: ActivationStatus;
      rollback: RollbackReport | null;
      compiled: Parameters<typeof buildDeploymentReport>[0]["compiled"];
      n8nVersion?: string | null;
    }) =>
      buildDeploymentReport({
        sessionId: input.sessionId,
        operation,
        deploymentId,
        revision: input.ir.revision,
        workflowId: o.workflowId,
        activationStatus: o.activationStatus,
        durationMs: now() - startedAt,
        issues,
        n8nVersion: o.n8nVersion ?? null,
        rollback: o.rollback,
        compiled: o.compiled,
        createdAt: startedAt,
      });

    /* ── 0. Preconditions ──────────────────────────────────────── */
    if (input.validation && input.validation.deploymentStatus === "BLOCKED") {
      issues.push({
        code: "PRECONDITION_FAILED",
        severity: "error",
        message: "Validation blocked this workflow; it must not be deployed.",
        recommendation: "Resolve the blocking validation errors, then redeploy.",
      });
      return finish({ workflowId: null, activationStatus: "UNKNOWN", rollback: null, compiled: null });
    }
    if (input.test && input.test.deploymentRecommendation === "DO_NOT_DEPLOY") {
      issues.push({
        code: "PRECONDITION_FAILED",
        severity: "error",
        message: "Testing recommended against deploying this workflow.",
        recommendation: "Fix the failing tests, then redeploy.",
      });
      return finish({ workflowId: null, activationStatus: "UNKNOWN", rollback: null, compiled: null });
    }
    if (!client.isConfigured()) {
      issues.push({
        code: "NOT_CONFIGURED",
        severity: "error",
        message: "No n8n instance is configured; nothing can be deployed.",
        recommendation: "Set N8N_API_URL and N8N_API_KEY, then redeploy.",
      });
      return finish({ workflowId: null, activationStatus: "UNKNOWN", rollback: null, compiled: null });
    }

    /* ── 1. Credentials (before compiling — fail fast) ─────────── */
    const resolver: CredentialResolver = input.credentialResolver ?? resolveCredentials;
    const creds = await resolver({ userId: input.userId, ir: input.ir });
    if (creds.errors.length > 0) {
      issues.push(...creds.errors);
      return finish({ workflowId: null, activationStatus: "UNKNOWN", rollback: null, compiled: null });
    }

    /* ── 2. Compile ────────────────────────────────────────────── */
    let compiled;
    try {
      const result = compileIrToN8n(input.ir, creds.attachments);
      compiled = result.workflow;
      issues.push(...result.warnings);
    } catch (err) {
      issues.push({
        code: "COMPILATION_FAILED",
        severity: "error",
        message:
          err instanceof CompilationError ? err.message : `Compilation failed: ${String(err)}`,
        recommendation: "Regenerate the workflow; its IR could not be compiled.",
      });
      return finish({ workflowId: null, activationStatus: "UNKNOWN", rollback: null, compiled: null });
    }

    /* ── 3. Upload (create or update) ──────────────────────────── */
    let workflowId: string;
    try {
      const ref = input.previous
        ? await client.update(input.previous.workflowId, compiled)
        : await client.create(compiled);
      workflowId = ref.id;
    } catch (err) {
      const { code, message } = classify(err);
      issues.push({
        code: code === "API_FAILURE" ? "UPLOAD_FAILED" : code,
        severity: "error",
        message: `Upload failed: ${message}`,
        recommendation: "Check n8n connectivity and credentials, then redeploy.",
      });
      // Nothing landed on a create; an update left the previous revision intact.
      return finish({ workflowId: null, activationStatus: "UNKNOWN", rollback: null, compiled });
    }

    /* ── 4. Verify the upload landed ───────────────────────────── */
    let verified;
    try {
      verified = await client.verify(workflowId);
    } catch (err) {
      verified = null;
      issues.push({
        code: "VERIFICATION_FAILED",
        severity: "warning",
        message: `Could not read the workflow back: ${classify(err).message}`,
        recommendation: "Confirm the workflow exists in n8n.",
      });
    }
    if (!verified) {
      issues.push({
        code: "VERIFICATION_FAILED",
        severity: "error",
        message: "The workflow was uploaded but could not be verified in n8n.",
        recommendation: "Check the n8n instance; the deployment may be incomplete.",
      });
      const rollback = await this.rollback({
        client,
        workflowId,
        created: !input.previous,
        previous: input.previous ?? null,
        reason: "Upload could not be verified.",
      });
      return finish({ workflowId, activationStatus: "UNKNOWN", rollback, compiled });
    }

    /* ── 5. Activate ───────────────────────────────────────────── */
    let activationStatus: ActivationStatus = "INACTIVE";
    try {
      const ref = await client.activate(workflowId);
      activationStatus = ref.active ? "ACTIVE" : "INACTIVE";
      if (!ref.active) {
        // n8n accepted the call but the workflow is not live — do not claim success.
        issues.push({
          code: "ACTIVATION_FAILED",
          severity: "error",
          message: "n8n reported the workflow as inactive after activation.",
          recommendation: "Check the trigger configuration in n8n, then redeploy.",
        });
        const rollback = await this.rollback({
          client,
          workflowId,
          created: !input.previous,
          previous: input.previous ?? null,
          reason: "Workflow did not become active.",
        });
        return finish({ workflowId, activationStatus, rollback, compiled });
      }
    } catch (err) {
      const { code, message } = classify(err);
      issues.push({
        code: code === "API_FAILURE" ? "ACTIVATION_FAILED" : code,
        severity: "error",
        message: `Activation failed: ${message}`,
        recommendation: "Check the trigger configuration in n8n, then redeploy.",
      });
      const rollback = await this.rollback({
        client,
        workflowId,
        created: !input.previous,
        previous: input.previous ?? null,
        reason: `Activation failed: ${message}`,
      });
      return finish({ workflowId, activationStatus: "UNKNOWN", rollback, compiled });
    }

    /* ── 6. Done ───────────────────────────────────────────────── */
    let n8nVersion: string | null = null;
    try {
      n8nVersion = await client.version();
    } catch {
      n8nVersion = null; // never fail a good deployment over a version read
    }

    return finish({ workflowId, activationStatus, rollback: null, compiled, n8nVersion });
  }

  /* ── lifecycle operations ───────────────────────────────────── */

  async pause(input: LifecycleInput): Promise<DeploymentReport> {
    return this.lifecycle(input, "PAUSE", async (client, workflowId) => {
      const ref = await client.deactivate(workflowId);
      return ref.active ? "ACTIVE" : "PAUSED";
    });
  }

  async resume(input: LifecycleInput): Promise<DeploymentReport> {
    return this.lifecycle(input, "RESUME", async (client, workflowId) => {
      const ref = await client.activate(workflowId);
      return ref.active ? "ACTIVE" : "INACTIVE";
    });
  }

  async deactivate(input: LifecycleInput): Promise<DeploymentReport> {
    return this.lifecycle(input, "DEACTIVATE", async (client, workflowId) => {
      const ref = await client.deactivate(workflowId);
      return ref.active ? "ACTIVE" : "INACTIVE";
    });
  }

  async remove(input: LifecycleInput): Promise<DeploymentReport> {
    return this.lifecycle(input, "DELETE", async (client, workflowId) => {
      await client.remove(workflowId);
      return "INACTIVE";
    });
  }

  /** Shared lifecycle scaffolding: precondition → act → structured report. */
  private async lifecycle(
    input: LifecycleInput,
    operation: DeploymentOperation,
    action: (
      client: N8nDeploymentClient,
      workflowId: string,
    ) => Promise<ActivationStatus>,
  ): Promise<DeploymentReport> {
    const client = input.client ?? liveN8nDeploymentClient;
    const now = input.now ?? (() => Date.now());
    const startedAt = now();
    const issues: DeploymentIssue[] = [];
    const deploymentId = input.deploymentId ?? `dep_${operation.toLowerCase()}_${startedAt.toString(36)}`;

    const finish = (workflowId: string | null, activationStatus: ActivationStatus) =>
      buildDeploymentReport({
        sessionId: input.sessionId,
        operation,
        deploymentId,
        revision: input.revision,
        workflowId,
        activationStatus,
        durationMs: now() - startedAt,
        issues,
        n8nVersion: null,
        rollback: null,
        compiled: null,
        createdAt: startedAt,
      });

    if (!input.workflowId) {
      issues.push({
        code: "NOT_DEPLOYED",
        severity: "error",
        message: `Cannot ${operation.toLowerCase()}: this workflow has never been deployed.`,
        recommendation: "Deploy the workflow before managing its lifecycle.",
      });
      return finish(null, "UNKNOWN");
    }
    if (!client.isConfigured()) {
      issues.push({
        code: "NOT_CONFIGURED",
        severity: "error",
        message: "No n8n instance is configured.",
        recommendation: "Set N8N_API_URL and N8N_API_KEY, then retry.",
      });
      return finish(input.workflowId, "UNKNOWN");
    }

    try {
      const status = await action(client, input.workflowId);
      return finish(input.workflowId, status);
    } catch (err) {
      const { code, message } = classify(err);
      issues.push({
        code,
        severity: "error",
        message: `${operation} failed: ${message}`,
        recommendation: "Check n8n connectivity, then retry.",
      });
      return finish(input.workflowId, "UNKNOWN");
    }
  }

  /* ── rollback ───────────────────────────────────────────────── */

  /**
   * Undo a partial deployment.
   *   - create path: deactivate + delete the workflow we just made.
   *   - update path: leave the row (deleting it would destroy the user's
   *     workflow) and restore the previous activation state.
   */
  private async rollback(input: {
    client: N8nDeploymentClient;
    workflowId: string;
    created: boolean;
    previous: PreviousDeployment | null;
    reason: string;
  }): Promise<RollbackReport> {
    const actions: string[] = [];
    let succeeded = true;

    try {
      if (input.created) {
        try {
          await input.client.deactivate(input.workflowId);
          actions.push(`Deactivated workflow ${input.workflowId}.`);
        } catch {
          // Already inactive / never activated — not a rollback failure.
          actions.push(`Workflow ${input.workflowId} was not active.`);
        }
        await input.client.remove(input.workflowId);
        actions.push(`Deleted workflow ${input.workflowId} (created by this deployment).`);
      } else if (input.previous) {
        if (input.previous.active) {
          await input.client.activate(input.workflowId);
          actions.push(`Restored revision ${input.previous.revision} to active.`);
        } else {
          await input.client.deactivate(input.workflowId);
          actions.push(`Restored revision ${input.previous.revision} to inactive.`);
        }
      }
    } catch (err) {
      succeeded = false;
      actions.push(`Rollback step failed: ${classify(err).message}`);
    }

    return {
      attempted: true,
      succeeded,
      actions,
      restoredRevision: input.previous?.revision ?? null,
      reason: input.reason,
    };
  }
}

export interface LifecycleInput {
  sessionId: string;
  revision: number;
  workflowId: string | null;
  client?: N8nDeploymentClient;
  now?: () => number;
  deploymentId?: string;
}

export const deploymentAgent = new N8nDeploymentAgent();
