/**
 * 6. Credential Testing — OAuth validity, expiry, scopes, permissions.
 *
 * "Never trust cached values" is honoured by consulting the injected
 * CredentialProbe, which is expected to inspect the live credential. When no
 * live probe is configured, this module does NOT pretend: it emits
 * CREDENTIAL_NOT_PROBED (info) and reports what is knowable from the current
 * connection state, so the reader knows exactly what coverage they got.
 *
 * Connection-state findings still block — a missing/expired/revoked connection
 * is a fact, not an assumption.
 */

import type { SupportedIntegration } from "@/lib/workflow";
import type { TestIssue } from "../../models/testing";
import { REQUIRED_SCOPES, type TestingContext } from "../context";

/** Integrations that need no credential (catalog auth kind "no_auth"). */
const NO_AUTH = new Set<SupportedIntegration>(["webhook", "forms"]);

export async function testCredentials(ctx: TestingContext): Promise<TestIssue[]> {
  const issues: TestIssue[] = [];

  const required = new Set<SupportedIntegration>();
  const trigger = ctx.ir.core.trigger;
  if ("integration" in trigger && trigger.integration) required.add(trigger.integration);
  for (const step of ctx.ir.core.steps) {
    if (step.integration) required.add(step.integration);
  }

  for (const integration of [...required].sort()) {
    if (NO_AUTH.has(integration)) continue;

    const affectedNode = ctx.ir.core.steps.find((s) => s.integration === integration)?.id;
    const conn = ctx.knownConnections.find((c) => c.integration === integration);

    /* ── connection state (a fact, always checked) ───────────── */
    if (!conn) {
      issues.push({
        code: "CREDENTIAL_MISSING",
        severity: "error",
        module: "credential",
        message: `${integration} has no connection; the workflow cannot authenticate.`,
        affectedNode,
        recommendation: `Connect ${integration} before deploying.`,
      });
      continue;
    }
    if (conn.status === "expired") {
      issues.push({
        code: "CREDENTIAL_EXPIRED",
        severity: "error",
        module: "credential",
        message: `The ${integration} connection has expired.`,
        affectedNode,
        recommendation: `Reconnect ${integration} to refresh its token.`,
      });
      continue;
    }
    if (conn.status !== "connected") {
      issues.push({
        code: "CREDENTIAL_INVALID",
        severity: "error",
        module: "credential",
        message: `The ${integration} connection is "${conn.status}" and cannot be used.`,
        affectedNode,
        recommendation: `Finish connecting ${integration}.`,
      });
      continue;
    }

    /* ── live inspection (only if a probe is configured) ──────── */
    const probed = await ctx.credentialProbe.inspect(ctx.userId, integration);
    if (!probed) {
      issues.push({
        code: "CREDENTIAL_NOT_PROBED",
        severity: "info",
        module: "credential",
        message: `${integration} credential was not live-checked (no credential probe configured); only its stored connection state was verified.`,
        affectedNode,
        recommendation: `Configure a credential probe to verify ${integration} token validity and scopes.`,
      });
      continue;
    }

    if (!probed.valid) {
      // Expiry is never re-derived from wall-clock here — comparing `expiresAt`
      // against Date.now() would make the report non-deterministic. The probe
      // holds the live truth and DECLARES expiry via `expired`; `expiresAt` is
      // carried for reporting only.
      const expired = probed.expired === true;
      issues.push({
        code: expired ? "CREDENTIAL_EXPIRED" : "CREDENTIAL_INVALID",
        severity: "error",
        module: "credential",
        message: expired
          ? `The ${integration} credential has expired${probed.expiresAt ? ` (expired ${probed.expiresAt})` : ""}.`
          : `${integration} credential failed live verification${probed.detail ? `: ${probed.detail}` : "."}`,
        affectedNode,
        recommendation: `Reconnect ${integration}${expired ? " to refresh its token" : ""}.`,
      });
      continue;
    }

    // Authenticated but not authorised for the action.
    if (probed.permissionDenied === true) {
      issues.push({
        code: "PERMISSION_DENIED",
        severity: "error",
        module: "credential",
        message: `${integration} authenticated but the provider denied permission${probed.detail ? `: ${probed.detail}` : "."}`,
        affectedNode,
        recommendation: `Grant the required permissions for ${integration}, then reconnect.`,
      });
      continue;
    }

    const needed = REQUIRED_SCOPES[integration];
    if (needed && probed.scopes) {
      const missing = needed.filter((s) => !probed.scopes!.includes(s));
      if (missing.length > 0) {
        issues.push({
          code: "MISSING_SCOPE",
          severity: "error",
          module: "credential",
          message: `${integration} is missing required scope(s): ${missing.join(", ")}.`,
          affectedNode,
          recommendation: `Reconnect ${integration} granting: ${missing.join(", ")}.`,
        });
      }
    } else if (needed && !probed.scopes) {
      issues.push({
        code: "CREDENTIAL_NOT_PROBED",
        severity: "info",
        module: "credential",
        message: `${integration} scopes were not reported by the probe; permission coverage is unverified.`,
        affectedNode,
        recommendation: `Have the probe report scopes for ${integration}.`,
      });
    }
  }

  return issues;
}
