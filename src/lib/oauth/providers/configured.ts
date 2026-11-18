/**
 * Data-driven providers on top of the existing provider pattern:
 *
 *  - ConfiguredOAuth2Provider: an AbstractOAuth2Provider whose endpoints,
 *    scopes and env come from a config object (Microsoft, Meta, Zoho,
 *    Pipedrive, Asana, GitHub).
 *  - ApiKeyProvider: API-key / bot-token apps (Telegram, Trello, Shopify,
 *    WooCommerce, SMTP email, Razorpay). No OAuth flow — the user pastes the
 *    key on a secure field once; it goes to the vault like any credential.
 *
 * Secrets are never logged. Validation only reports an HTTP status.
 */

import { AbstractOAuth2Provider, type ProviderEnvConfig } from "../base-provider";
import { OAuthProviderNotConfiguredError } from "../errors";
import type {
  BeginOAuthInput,
  BeginOAuthOutput,
  CompleteOAuthInput,
  CompleteOAuthOutput,
  ProviderCapabilities,
  TokenSet,
} from "../types";

export interface OAuth2Config {
  capabilities: ProviderCapabilities;
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string | null;
  validationEndpoint: string;
  env: () => ProviderEnvConfig;
  extraAuthParams?: Record<string, string>;
  scopeSeparator?: string;
  tokenHeaders?: Record<string, string>;
  clientAuthStyle?: "body" | "basic";
  /** Authorization header scheme for validation (Zoho uses "Zoho-oauthtoken"). */
  authScheme?: string;
  /** Field in the token response that names the account (e.g. "email"). */
  accountLabelField?: string;
}

export class ConfiguredOAuth2Provider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities;
  protected readonly authorizationUrl: string;
  protected readonly tokenUrl: string;
  protected override readonly revokeUrl: string | null;
  protected readonly validationEndpoint: string;
  protected override readonly clientAuthStyle: "body" | "basic";
  private readonly config: OAuth2Config;

  constructor(config: OAuth2Config) {
    super();
    this.config = config;
    this.capabilities = config.capabilities;
    this.authorizationUrl = config.authorizationUrl;
    this.tokenUrl = config.tokenUrl;
    this.revokeUrl = config.revokeUrl ?? null;
    this.validationEndpoint = config.validationEndpoint;
    this.clientAuthStyle = config.clientAuthStyle ?? "body";
  }

  protected envConfig(): ProviderEnvConfig {
    return this.config.env();
  }

  protected override extraAuthParams(_input: BeginOAuthInput): Record<string, string> {
    return this.config.extraAuthParams ?? {};
  }

  protected override formatScopes(scopes: readonly string[]): string {
    return scopes.join(this.config.scopeSeparator ?? " ");
  }

  protected override tokenRequestHeaders(): Record<string, string> {
    return this.config.tokenHeaders ?? {};
  }

  protected override parseTokenResponse(raw: Record<string, unknown>) {
    const base = super.parseTokenResponse(raw);
    const field = this.config.accountLabelField;
    const label = field && typeof raw[field] === "string" ? (raw[field] as string) : undefined;
    return { ...base, accountLabel: label };
  }

  override async validateConnection(tokens: TokenSet): Promise<{ ok: boolean; reason?: string }> {
    const response = await fetch(this.validationEndpoint, {
      headers: { Authorization: `${this.config.authScheme ?? "Bearer"} ${tokens.accessToken}` },
    });
    return response.ok ? { ok: true } : { ok: false, reason: `HTTP ${response.status}` };
  }
}

/* ── API-key / bot-token apps ─────────────────────────────────────── */

export interface ApiKeyConfig {
  capabilities: ProviderCapabilities;
  /** Fields the user must supply (shown as secure inputs). */
  fields: readonly string[];
  /** Build a read-only check request from the stored payload, or null when the app cannot be checked over HTTP. */
  check: ((payload: Record<string, unknown>) => { url: string; headers?: Record<string, string> } | null) | null;
}

export class ApiKeyProvider extends AbstractOAuth2Provider {
  readonly capabilities: ProviderCapabilities;
  readonly fields: readonly string[];
  protected readonly authorizationUrl = "";
  protected readonly tokenUrl = "";
  protected readonly validationEndpoint = "";
  private readonly config: ApiKeyConfig;

  constructor(config: ApiKeyConfig) {
    super();
    this.config = config;
    this.capabilities = config.capabilities;
    this.fields = config.fields;
  }

  protected envConfig(): ProviderEnvConfig {
    return { clientId: "n/a", clientSecret: "n/a" };
  }

  override isReady(): boolean {
    return true;
  }

  override async beginOAuthFlow(_input: BeginOAuthInput): Promise<BeginOAuthOutput> {
    throw new OAuthProviderNotConfiguredError(
      `${this.capabilities.displayName} connects with a key, not a sign-in page.`,
      { provider: this.capabilities.integration },
    );
  }

  override async completeOAuthFlow(_input: CompleteOAuthInput): Promise<CompleteOAuthOutput> {
    throw new OAuthProviderNotConfiguredError(
      `${this.capabilities.displayName} connects with a key, not a sign-in page.`,
      { provider: this.capabilities.integration },
    );
  }

  /** Missing required fields, so the connect route can reject before storing. */
  missingFields(payload: Record<string, unknown>): string[] {
    return this.fields.filter((f) => payload[f] === undefined || payload[f] === null || payload[f] === "");
  }

  override async validateConnection(tokens: TokenSet): Promise<{ ok: boolean; reason?: string }> {
    const payload = tokens as unknown as Record<string, unknown>;
    const missing = this.missingFields(payload);
    if (missing.length > 0) return { ok: false, reason: `Missing ${missing.join(", ")}` };
    const req = this.config.check?.(payload) ?? null;
    if (!req) return { ok: true, reason: "Saved (this app cannot be checked over the web)." };
    const response = await fetch(req.url, { headers: req.headers ?? {} });
    return response.ok ? { ok: true } : { ok: false, reason: `HTTP ${response.status}` };
  }
}
