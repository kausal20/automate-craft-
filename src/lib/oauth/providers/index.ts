/**
 * OAuth provider registry.
 *
 * Lazy singleton cache — instantiates on first request. Adding a
 * provider:
 *   1. Implement subclass of AbstractOAuth2Provider in this directory.
 *   2. Register an entry in `INSTANTIATE` below.
 *   3. Add env vars to `env.oauth.<name>`.
 */

import type { OAuthProvider } from "../types";
import { GoogleOAuthProvider } from "./google";
import { SlackOAuthProvider } from "./slack";
import { HubspotOAuthProvider } from "./hubspot";
import { DiscordOAuthProvider } from "./discord";
import { NotionOAuthProvider } from "./notion";
import { StripeOAuthProvider } from "./stripe";
import { AirtableOAuthProvider } from "./airtable";
import { SalesforceOAuthProvider } from "./salesforce";
import { WhatsAppProvider } from "./whatsapp";
import { OAuthUnsupportedProviderError } from "../errors";
import { ApiKeyProvider, ConfiguredOAuth2Provider } from "./configured";
import { env } from "@/lib/env";
import { MICROSOFT_SCOPES, META_SCOPES, storeAccount } from "@/lib/connections/store";
import type { SupportedIntegration } from "@/lib/workflow";

function caps(slug: SupportedIntegration, grantType: "authorization_code" | "api_key", supportsRefresh: boolean) {
  const a = storeAccount(slug)!;
  return {
    integration: slug,
    displayName: a.displayName,
    grantType,
    defaultScopes: a.scopes,
    supportsRefresh,
    refreshSkewSeconds: supportsRefresh ? 600 : 0,
    n8nCredentialType: a.n8nCredentialType ?? "none",
  };
}

function apiKey(slug: SupportedIntegration, check: ConstructorParameters<typeof ApiKeyProvider>[0]["check"]) {
  return new ApiKeyProvider({ capabilities: caps(slug, "api_key", false), fields: storeAccount(slug)!.credentialFields ?? [], check });
}

const basic = (u: unknown, p: unknown) => `Basic ${Buffer.from(`${String(u)}:${String(p)}`).toString("base64")}`;

export type ProviderSlug =
  | "google"
  | "slack"
  | "hubspot"
  | "discord"
  | "notion"
  | "stripe"
  | "airtable"
  | "salesforce"
  | "whatsapp"
  | "microsoft"
  | "meta"
  | "zoho_crm"
  | "pipedrive"
  | "asana"
  | "github"
  | "telegram"
  | "trello"
  | "shopify"
  | "woocommerce"
  | "email"
  | "razorpay";

const INSTANTIATE: Record<ProviderSlug, () => OAuthProvider> = {
  google: () => new GoogleOAuthProvider(),
  slack: () => new SlackOAuthProvider(),
  hubspot: () => new HubspotOAuthProvider(),
  discord: () => new DiscordOAuthProvider(),
  notion: () => new NotionOAuthProvider(),
  stripe: () => new StripeOAuthProvider(),
  airtable: () => new AirtableOAuthProvider(),
  salesforce: () => new SalesforceOAuthProvider(),
  whatsapp: () => new WhatsAppProvider(),
  microsoft: () =>
    new ConfiguredOAuth2Provider({
      capabilities: { ...caps("microsoft", "authorization_code", true), defaultScopes: MICROSOFT_SCOPES },
      authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      validationEndpoint: "https://graph.microsoft.com/v1.0/me",
      env: () => env.oauth.microsoft,
      extraAuthParams: { response_mode: "query", prompt: "select_account" },
    }),
  meta: () =>
    new ConfiguredOAuth2Provider({
      capabilities: { ...caps("meta", "authorization_code", false), defaultScopes: META_SCOPES },
      authorizationUrl: "https://www.facebook.com/v19.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
      validationEndpoint: "https://graph.facebook.com/v19.0/me",
      env: () => env.oauth.meta,
      scopeSeparator: ",",
    }),
  zoho_crm: () =>
    new ConfiguredOAuth2Provider({
      capabilities: caps("zoho_crm", "authorization_code", true),
      authorizationUrl: `https://accounts.${env.oauth.zoho.domain}/oauth/v2/auth`,
      tokenUrl: `https://accounts.${env.oauth.zoho.domain}/oauth/v2/token`,
      validationEndpoint: `https://www.zohoapis.${env.oauth.zoho.domain.replace(/^zoho\./, "")}/crm/v2/users?type=CurrentUser`,
      env: () => env.oauth.zoho,
      extraAuthParams: { access_type: "offline", prompt: "consent" },
      scopeSeparator: ",",
      authScheme: "Zoho-oauthtoken",
    }),
  pipedrive: () =>
    new ConfiguredOAuth2Provider({
      capabilities: caps("pipedrive", "authorization_code", true),
      authorizationUrl: "https://oauth.pipedrive.com/oauth/authorize",
      tokenUrl: "https://oauth.pipedrive.com/oauth/token",
      validationEndpoint: "https://api.pipedrive.com/v1/users/me",
      env: () => env.oauth.pipedrive,
      clientAuthStyle: "basic",
    }),
  asana: () =>
    new ConfiguredOAuth2Provider({
      capabilities: caps("asana", "authorization_code", true),
      authorizationUrl: "https://app.asana.com/-/oauth_authorize",
      tokenUrl: "https://app.asana.com/-/oauth_token",
      validationEndpoint: "https://app.asana.com/api/1.0/users/me",
      env: () => env.oauth.asana,
    }),
  github: () =>
    new ConfiguredOAuth2Provider({
      capabilities: caps("github", "authorization_code", false),
      authorizationUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      validationEndpoint: "https://api.github.com/user",
      env: () => env.oauth.github,
      tokenHeaders: { Accept: "application/json" },
    }),
  telegram: () => apiKey("telegram", (p) => ({ url: `https://api.telegram.org/bot${encodeURIComponent(String(p.botToken))}/getMe` })),
  trello: () =>
    apiKey("trello", (p) => ({
      url: `https://api.trello.com/1/members/me?key=${encodeURIComponent(String(p.apiKey))}&token=${encodeURIComponent(String(p.apiToken))}`,
    })),
  shopify: () =>
    apiKey("shopify", (p) => {
      const shop = String(p.shopSubdomain ?? "");
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(shop)) return null;
      return { url: `https://${shop}.myshopify.com/admin/api/2024-07/shop.json`, headers: { "X-Shopify-Access-Token": String(p.accessToken) } };
    }),
  woocommerce: () =>
    apiKey("woocommerce", (p) => {
      const url = String(p.url ?? "");
      if (!/^https:\/\//.test(url)) return null;
      return { url: `${url.replace(/\/+$/, "")}/wp-json/wc/v3/orders?per_page=1`, headers: { Authorization: basic(p.consumerKey, p.consumerSecret) } };
    }),
  // SMTP cannot be checked over HTTP; it is checked on the first send.
  email: () => apiKey("email", null),
  razorpay: () => apiKey("razorpay", (p) => ({ url: "https://api.razorpay.com/v1/payments?count=1", headers: { Authorization: basic(p.keyId, p.keySecret) } })),
};

const cache = new Map<ProviderSlug, OAuthProvider>();

export function getOAuthProvider(slug: string): OAuthProvider {
  if (!(slug in INSTANTIATE)) {
    throw new OAuthUnsupportedProviderError(
      `No OAuth provider registered for "${slug}".`,
      { slug },
    );
  }
  const typed = slug as ProviderSlug;
  let provider = cache.get(typed);
  if (!provider) {
    provider = INSTANTIATE[typed]();
    cache.set(typed, provider);
  }
  return provider;
}
