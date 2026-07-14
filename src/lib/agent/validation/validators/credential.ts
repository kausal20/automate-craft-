/**
 * 8. Credential Validator — never assumes credentials exist.
 *
 * The IR's `connections[].connected` is only an advisory snapshot taken at
 * PLANNING time. This validator is authoritative: it re-checks every required
 * integration against the live `knownConnections` passed into the context and
 * ignores the snapshot entirely.
 *
 * Statuses: connected → OK; expired → error; pending/revoked/absent → error.
 */

import type { SupportedIntegration } from "@/lib/workflow";
import type { KnownConnection } from "../../models/session";
import type { ValidationIssue } from "../../models/validation";
import type { ValidatorContext } from "../context";

/** Integrations that need no credential (catalog auth kind "no_auth"). */
const NO_AUTH_INTEGRATIONS = new Set<SupportedIntegration>(["webhook", "forms"]);

export function validateCredentials(ctx: ValidatorContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { ir, knownConnections } = ctx;

  // Required = integrations actually referenced by the core (trigger + steps).
  const required = new Set<SupportedIntegration>();
  if (ir.core.trigger && "integration" in ir.core.trigger && ir.core.trigger.integration) {
    required.add(ir.core.trigger.integration);
  }
  for (const step of ir.core.steps) {
    if (step.integration) required.add(step.integration);
  }

  for (const integration of [...required].sort()) {
    if (NO_AUTH_INTEGRATIONS.has(integration)) continue;

    const conn: KnownConnection | undefined = knownConnections.find(
      (c) => c.integration === integration,
    );
    const usedBy = ir.core.steps
      .filter((s) => s.integration === integration)
      .map((s) => s.id);
    const affectedNode = usedBy[0];

    if (!conn) {
      issues.push({
        code: "CREDENTIAL_MISSING",
        severity: "error",
        category: "credential",
        message: `${integration} is required but no connection exists.`,
        affectedNode,
        recommendation: `Connect ${integration} before deploying.`,
      });
      continue;
    }

    switch (conn.status) {
      case "connected":
        break;
      case "expired":
        issues.push({
          code: "CREDENTIAL_EXPIRED",
          severity: "error",
          category: "credential",
          message: `The ${integration} connection has expired.`,
          affectedNode,
          recommendation: `Reconnect ${integration} to refresh its credentials.`,
        });
        break;
      case "revoked":
        issues.push({
          code: "CONNECTION_NOT_ACTIVE",
          severity: "error",
          category: "credential",
          message: `The ${integration} connection was revoked.`,
          affectedNode,
          recommendation: `Reconnect ${integration} to restore access.`,
        });
        break;
      case "pending":
      default:
        issues.push({
          code: "CONNECTION_NOT_ACTIVE",
          severity: "error",
          category: "credential",
          message: `The ${integration} connection is "${conn.status}" and not usable.`,
          affectedNode,
          recommendation: `Finish connecting ${integration}.`,
        });
        break;
    }
  }

  // Drift between the planning snapshot and reality — advisory only.
  for (const c of ir.connections) {
    const live = knownConnections.find((k) => k.integration === c.integration);
    const liveConnected = live?.status === "connected";
    if (c.connected !== liveConnected) {
      issues.push({
        code: "CONNECTION_NOT_ACTIVE",
        severity: "info",
        category: "credential",
        message: `Connection state for ${c.integration} changed since planning (was ${c.connected ? "connected" : "not connected"}, now ${liveConnected ? "connected" : "not connected"}).`,
        affectedNode: c.usedByNodes[0],
        recommendation: `Re-plan if the ${c.integration} change was unintended.`,
      });
    }
  }

  return issues;
}
