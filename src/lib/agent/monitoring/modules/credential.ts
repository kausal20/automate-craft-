/**
 * 7. Credential Health Monitor.
 *
 * "Never assume credentials remain valid after deployment" — so this module
 * reads the OBSERVED credential state passed into the context plus the runtime
 * event stream. It does not trust the deployment report's credential outcome,
 * which only described the state at deploy time.
 *
 * With no observations at all it reports nothing rather than implying health.
 */

import type { Alert, CredentialObservation } from "../../models/monitoring";
import { THRESHOLDS, type MonitoringContext } from "../context";
import type { RuntimeObservations } from "./runtime";

export interface CredentialHealth {
  observations: CredentialObservation[];
  alerts: Alert[];
}

const OAUTH_RE = /oauth/i;
const REFRESH_RE = /refresh/i;
const PERMISSION_RE = /permission|forbidden|403|scope/i;

export function monitorCredentials(
  ctx: MonitoringContext,
  runtime: RuntimeObservations,
): CredentialHealth {
  const alerts: Alert[] = [];

  /* ── observed connection state ─────────────────────────────── */
  for (const c of [...ctx.credentials].sort((a, b) => a.integration.localeCompare(b.integration))) {
    switch (c.status) {
      case "expired":
        alerts.push({
          code: "CREDENTIAL_EXPIRED",
          severity: "CRITICAL",
          message: `The ${c.integration} credential has expired; the workflow cannot authenticate.`,
          target: c.integration,
          evidence: `Observed connection status "expired" for ${c.integration}.`,
        });
        break;
      case "revoked":
        alerts.push({
          code: "CREDENTIAL_DISCONNECTED",
          severity: "CRITICAL",
          message: `The ${c.integration} account was disconnected.`,
          target: c.integration,
          evidence: `Observed connection status "revoked" for ${c.integration}.`,
        });
        break;
      case "pending":
        alerts.push({
          code: "CREDENTIAL_DISCONNECTED",
          severity: "HIGH",
          message: `The ${c.integration} connection is still pending and cannot be used.`,
          target: c.integration,
          evidence: `Observed connection status "pending" for ${c.integration}.`,
        });
        break;
      case "connected":
      default:
        break;
    }

    // Expiring soon — early warning from a real expiry timestamp only.
    if (c.status === "connected" && typeof c.expiresAt === "number") {
      const remaining = c.expiresAt - ctx.now;
      if (remaining <= 0) {
        alerts.push({
          code: "CREDENTIAL_EXPIRED",
          severity: "CRITICAL",
          message: `The ${c.integration} token expiry has passed.`,
          target: c.integration,
          evidence: `expiresAt ${new Date(c.expiresAt).toISOString()} is in the past.`,
        });
      } else if (remaining <= THRESHOLDS.credentialExpiryWarnMs) {
        const days = Math.max(1, Math.round(remaining / 86_400_000));
        alerts.push({
          code: "CREDENTIAL_EXPIRING",
          severity: "MEDIUM",
          message: `The ${c.integration} credential expires in ~${days} day(s).`,
          target: c.integration,
          evidence: `expiresAt ${new Date(c.expiresAt).toISOString()}.`,
        });
      }
    }
  }

  /* ── credential failures seen at runtime ───────────────────── */
  const credErrors = runtime.credentialEvents.filter((e) => e.level === "error");
  const refreshFailures = credErrors.filter((e) => REFRESH_RE.test(`${e.kind} ${e.message}`));
  const oauthFailures = credErrors.filter(
    (e) => OAUTH_RE.test(`${e.kind} ${e.message}`) && !REFRESH_RE.test(`${e.kind} ${e.message}`),
  );
  const permissionFailures = credErrors.filter((e) =>
    PERMISSION_RE.test(`${e.kind} ${e.message}`),
  );

  if (refreshFailures.length > 0) {
    alerts.push({
      code: "TOKEN_REFRESH_FAILURE",
      severity: "HIGH",
      message: `${refreshFailures.length} token refresh failure(s) observed.`,
      target: refreshFailures[0].nodeId,
      evidence: refreshFailures[0].message,
    });
  }
  if (oauthFailures.length > 0) {
    alerts.push({
      code: "OAUTH_FAILURE",
      severity: "HIGH",
      message: `${oauthFailures.length} OAuth failure(s) observed at runtime.`,
      target: oauthFailures[0].nodeId,
      evidence: oauthFailures[0].message,
    });
  }
  if (permissionFailures.length > 0) {
    alerts.push({
      code: "PERMISSION_FAILURE",
      severity: "HIGH",
      message: `${permissionFailures.length} permission failure(s) observed at runtime.`,
      target: permissionFailures[0].nodeId,
      evidence: permissionFailures[0].message,
    });
  }

  return { observations: [...ctx.credentials], alerts };
}
