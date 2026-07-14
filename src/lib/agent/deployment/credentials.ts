/**
 * Credential resolution for deployment.
 *
 * Wraps the existing vault→n8n mapper (`adapters/n8n/credentials/mapper`)
 * rather than reimplementing it. Adds the deployment-level contract: work out
 * which integrations the IR actually needs, and FAIL with a structured error
 * when any required credential is unavailable — never deploy a workflow that
 * cannot authenticate.
 *
 * Credential ids are always resolved from the vault at deploy time; nothing is
 * hardcoded and nothing is trusted from the IR (its `connections[].connected`
 * is only a planning snapshot).
 */

import { buildCredentialAttachments, type CredentialAttachmentMap } from "@/lib/adapters/n8n/credentials/mapper";
import { getOAuthProvider } from "@/lib/oauth";
import type { SupportedIntegration } from "@/lib/workflow";
import type { AgentWorkflowIR } from "../models/workflow-ir";
import type { DeploymentIssue } from "../models/deployment";

/** Integrations that need no credential (catalog auth kind "no_auth"). */
const NO_AUTH_INTEGRATIONS = new Set<SupportedIntegration>(["webhook", "forms"]);

export interface CredentialResolution {
  attachments: CredentialAttachmentMap;
  errors: DeploymentIssue[];
}

/**
 * Credential resolution contract. Injected for the same reason the n8n client
 * is: it reaches the live vault, so it must be replaceable to exercise the
 * deployment lifecycle without one. Production uses `resolveCredentials`.
 */
export type CredentialResolver = (input: {
  userId: string;
  ir: AgentWorkflowIR;
}) => Promise<CredentialResolution>;

/** Integrations the IR genuinely needs a credential for. */
export function requiredIntegrations(ir: AgentWorkflowIR): SupportedIntegration[] {
  const required = new Set<SupportedIntegration>();
  const trigger = ir.core.trigger;
  if ("integration" in trigger && trigger.integration) required.add(trigger.integration);
  for (const step of ir.core.steps) {
    if (step.integration) required.add(step.integration);
  }
  return [...required].filter((i) => !NO_AUTH_INTEGRATIONS.has(i)).sort();
}

/**
 * Resolve every required credential into an n8n attachment. Any integration
 * without a usable vault-backed credential produces a blocking error.
 */
export async function resolveCredentials(input: {
  userId: string;
  ir: AgentWorkflowIR;
}): Promise<CredentialResolution> {
  const errors: DeploymentIssue[] = [];
  const required = requiredIntegrations(input.ir);

  if (required.length === 0) {
    return { attachments: {}, errors };
  }

  let attachments: CredentialAttachmentMap;
  try {
    attachments = await buildCredentialAttachments({
      userId: input.userId,
      integrations: required,
    });
  } catch (err) {
    errors.push({
      code: "CREDENTIAL_RESOLUTION_FAILED",
      severity: "error",
      message: `Could not resolve credentials from the vault: ${err instanceof Error ? err.message : String(err)}`,
      recommendation: "Check the credential vault configuration, then redeploy.",
    });
    return { attachments: {}, errors };
  }

  // Every required integration must have produced an attachment under its
  // n8n credential type.
  for (const integration of required) {
    const credentialType = n8nCredentialTypeFor(integration);
    if (!credentialType) {
      errors.push({
        code: "CREDENTIAL_MISSING",
        severity: "error",
        message: `No credential type is registered for "${integration}"; it cannot be deployed.`,
        affectedNode: integration,
        recommendation: `Register an OAuth provider for ${integration} before deploying.`,
      });
      continue;
    }
    if (!attachments[credentialType]) {
      errors.push({
        code: "CREDENTIAL_MISSING",
        severity: "error",
        message: `${integration} is required but has no synced credential in n8n.`,
        affectedNode: integration,
        recommendation: `Connect ${integration} and sync its credential, then redeploy.`,
      });
    }
  }

  return { attachments, errors };
}

function n8nCredentialTypeFor(integration: SupportedIntegration): string | null {
  try {
    return getOAuthProvider(integration).capabilities.n8nCredentialType;
  } catch {
    return null;
  }
}
