/**
 * Probe contracts for the Testing Agent.
 *
 * WHY PROBES ARE INJECTED
 *   Two requirements pull in opposite directions: "verify Slack/Google/Stripe
 *   are reachable and credentials are valid" (needs live I/O) and "identical
 *   Workflow IR ⇒ identical Test Report, no randomness" (forbids live I/O).
 *
 *   Resolution: live checks live behind these interfaces. The DEFAULT probes
 *   are offline and honestly report SKIPPED — the agent never claims a service
 *   is reachable or a token is valid when it did not actually check. A live
 *   probe can be injected in production (or a fixture probe in tests) without
 *   touching the modules.
 *
 * SAFETY
 *   Probes must only ever hit read-only / metadata / dry-run endpoints
 *   (e.g. Slack auth.test, Google tokeninfo). Never a destructive call.
 */

import type { SupportedIntegration } from "@/lib/workflow";

export interface ApiProbeResult {
  reachable: boolean;
  /** Latency observed by the probe, when it measured one. */
  latencyMs?: number;
  /** Human detail, e.g. "auth.test 200" or "connect ETIMEDOUT". */
  detail?: string;
}

export interface ApiProbe {
  /**
   * Check that an integration's API answers. MUST use a read-only or metadata
   * endpoint. Return null when this probe cannot assess the integration.
   */
  check(integration: SupportedIntegration): Promise<ApiProbeResult | null>;
}

export interface CredentialProbeResult {
  /** Whether the credential authenticates right now. */
  valid: boolean;
  /**
   * True when the provider reports the token as EXPIRED (as opposed to
   * malformed/revoked). The probe declares this rather than the module deriving
   * it from `expiresAt` vs the clock — that would make the report
   * non-deterministic. The probe has the live truth; it should state it.
   */
  expired?: boolean;
  /**
   * True when the credential authenticates but the provider refuses the action
   * (authenticated, not authorised).
   */
  permissionDenied?: boolean;
  /** ISO expiry, when the provider exposes one. Reporting only. */
  expiresAt?: string | null;
  /** Scopes the token actually carries. */
  scopes?: string[];
  detail?: string;
}

export interface CredentialProbe {
  /**
   * Inspect a live credential (never a cached copy). Return null when this
   * probe cannot assess the integration.
   */
  inspect(
    userId: string,
    integration: SupportedIntegration,
  ): Promise<CredentialProbeResult | null>;
}

/**
 * Default offline probes. They assess nothing and say so — modules then emit
 * SKIPPED with a reason instead of inventing a result.
 */
export const offlineApiProbe: ApiProbe = {
  async check() {
    return null;
  },
};

export const offlineCredentialProbe: CredentialProbe = {
  async inspect() {
    return null;
  },
};
