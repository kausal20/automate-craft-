/**
 * Integration registry.
 *
 * Per-integration metadata used by the connection service:
 *   - display name + tagline (UI)
 *   - auth kind (oauth2 / api_key / no_auth)
 *   - default vault credential name (`"default"`)
 *   - OAuth URL builder + callback path (Phase 4)
 *
 * Phase 2 ships a metadata-only registry; OAuth flow implementations
 * land in Phase 4. The interface stays stable so adding a new provider
 * is one entry here + one provider file.
 */

import { SUPPORTED_INTEGRATIONS, type SupportedIntegration } from "@/lib/workflow";
import { listStoreAccounts, listStoreApps, storeAccount } from "./store";

export type IntegrationAuthKind = "oauth2" | "api_key" | "bot_token" | "no_auth";

export type IntegrationMetadata = {
  integration: SupportedIntegration;
  displayName: string;
  tagline: string;
  authKind: IntegrationAuthKind;
  defaultCredentialName: string;
  defaultScopes: readonly string[];
  docsUrl?: string;
  /** The account (one sign-in) this app runs on, e.g. gmail -> google. */
  account: SupportedIntegration;
  /** True for sign-in accounts that are not planned with directly (microsoft, meta). */
  accountOnly: boolean;
};

/** Built from the connector store (src/lib/connections/store.ts) — one entry per slug. */
function buildRegistry(): Record<SupportedIntegration, IntegrationMetadata> {
  const out = {} as Record<SupportedIntegration, IntegrationMetadata>;
  const apps = new Map(listStoreApps().map((a) => [a.slug, a]));
  for (const account of listStoreAccounts()) {
    if (apps.has(account.slug)) continue;
    out[account.slug] = {
      integration: account.slug,
      displayName: account.displayName,
      tagline: account.tagline,
      authKind: account.authKind,
      defaultCredentialName: "default",
      defaultScopes: account.scopes,
      docsUrl: account.docsUrl,
      account: account.slug,
      accountOnly: true,
    };
  }
  for (const app of apps.values()) {
    const account = storeAccount(app.account)!;
    out[app.slug] = {
      integration: app.slug,
      displayName: app.displayName,
      tagline: app.tagline,
      authKind: account.authKind,
      defaultCredentialName: "default",
      defaultScopes: account.scopes,
      docsUrl: account.docsUrl,
      account: account.slug,
      accountOnly: false,
    };
  }
  for (const slug of SUPPORTED_INTEGRATIONS) {
    if (!out[slug]) throw new Error(`Connector store has no entry for "${slug}".`);
  }
  return out;
}

const REGISTRY = buildRegistry();

export function getIntegrationMetadata(
  integration: SupportedIntegration,
): IntegrationMetadata {
  return REGISTRY[integration];
}

export function listIntegrationMetadata(): IntegrationMetadata[] {
  return Object.values(REGISTRY);
}

export function requiresCredential(integration: SupportedIntegration): boolean {
  return REGISTRY[integration].authKind !== "no_auth";
}
