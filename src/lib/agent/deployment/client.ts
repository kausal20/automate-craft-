/**
 * Deployment client contract.
 *
 * Deployment is an ACTION against a live n8n instance, so — unlike validation
 * or testing — it cannot be made deterministic or run offline. The client is
 * therefore injected: production passes `liveN8nDeploymentClient` (a thin
 * wrapper over the existing `n8nClient`), tests pass a deterministic fake.
 *
 * The agent talks ONLY through this interface, so the whole lifecycle
 * (create/update/activate/deactivate/delete/verify) is exercisable without a
 * real n8n, and no HTTP detail leaks into the agent.
 */

import { n8nClient } from "@/lib/adapters/n8n/client/http-client";
import type { N8nWorkflow } from "@/lib/adapters/n8n/client/types";
import { hasN8nConfigured } from "@/lib/env";

export interface DeployedWorkflowRef {
  id: string;
  active: boolean;
  name: string;
}

export interface N8nDeploymentClient {
  /** Whether the target instance is configured/usable at all. */
  isConfigured(): boolean;
  create(workflow: N8nWorkflow): Promise<DeployedWorkflowRef>;
  update(workflowId: string, workflow: N8nWorkflow): Promise<DeployedWorkflowRef>;
  activate(workflowId: string): Promise<DeployedWorkflowRef>;
  deactivate(workflowId: string): Promise<DeployedWorkflowRef>;
  remove(workflowId: string): Promise<void>;
  /** Read the workflow back to confirm the upload landed. */
  verify(workflowId: string): Promise<DeployedWorkflowRef | null>;
  /** n8n version when the instance exposes one; null otherwise. */
  version(): Promise<string | null>;
}

/** Live client — wraps the existing n8n adapter HTTP client. */
export const liveN8nDeploymentClient: N8nDeploymentClient = {
  isConfigured() {
    return hasN8nConfigured();
  },

  async create(workflow) {
    const res = await n8nClient.createWorkflow(workflow);
    return { id: res.id, active: res.active, name: res.name };
  },

  async update(workflowId, workflow) {
    const res = await n8nClient.updateWorkflow(workflowId, workflow);
    return { id: res.id, active: res.active, name: res.name };
  },

  async activate(workflowId) {
    const res = await n8nClient.activateWorkflow(workflowId);
    return { id: res.id, active: res.active, name: "" };
  },

  async deactivate(workflowId) {
    const res = await n8nClient.deactivateWorkflow(workflowId);
    return { id: res.id, active: res.active, name: "" };
  },

  async remove(workflowId) {
    await n8nClient.deleteWorkflow(workflowId);
  },

  async verify(workflowId) {
    // The narrow client exposes no GET /workflows/{id}; a PATCH with an empty
    // body round-trips the row without mutating it, which is enough to confirm
    // the workflow exists and is readable.
    try {
      const res = await n8nClient.updateWorkflow(workflowId, {});
      return { id: res.id, active: res.active, name: res.name };
    } catch {
      return null;
    }
  },

  async version() {
    // The n8n REST surface we depend on does not expose a version endpoint.
    // Reporting null is honest; claiming a version we never read would not be.
    return null;
  },
};
