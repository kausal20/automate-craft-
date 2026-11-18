/**
 * Vault payload -> n8n credential `data` for each n8n credential type.
 *
 * The vault stores what the provider gave us (an OAuth token set, or the keys
 * the user pasted). n8n expects its own field names per credential type, so
 * uploading the raw vault payload (the June behaviour) produced credentials
 * n8n could not use. Field names follow n8n's credential definitions; they are
 * live-unverified until the first real sync.
 */

import { env } from "@/lib/env";

type Payload = Record<string, unknown>;

/** OAuth2 credential types n8n refreshes itself from oauthTokenData. */
const OAUTH2_ENV: Record<string, () => { clientId?: string; clientSecret?: string }> = {
  googleOAuth2Api: () => env.oauth.google,
  microsoftOAuth2Api: () => env.oauth.microsoft,
  hubspotOAuth2Api: () => env.oauth.hubspot,
  salesforceOAuth2Api: () => env.oauth.salesforce,
  zohoOAuth2Api: () => env.oauth.zoho,
  pipedriveOAuth2Api: () => env.oauth.pipedrive,
  asanaOAuth2Api: () => env.oauth.asana,
  githubOAuth2Api: () => env.oauth.github,
};

const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));

export function toN8nCredentialData(type: string, payload: Payload, scopes: readonly string[] = []): Payload {
  const oauthEnv = OAUTH2_ENV[type];
  if (oauthEnv) {
    const { clientId, clientSecret } = oauthEnv();
    const expiresAt = payload.expiresAt ? Date.parse(String(payload.expiresAt)) : NaN;
    return {
      clientId: s(clientId),
      clientSecret: s(clientSecret),
      scope: (scopes.length ? scopes : ((payload.scopes as string[] | undefined) ?? [])).join(" "),
      oauthTokenData: {
        access_token: s(payload.accessToken),
        ...(payload.refreshToken ? { refresh_token: s(payload.refreshToken) } : {}),
        token_type: s(payload.tokenType || "Bearer"),
        ...(Number.isFinite(expiresAt) ? { expires_in: Math.max(0, Math.round((expiresAt - Date.now()) / 1000)) } : {}),
      },
    };
  }
  switch (type) {
    case "notionApi":
      return { apiKey: s(payload.accessToken) };
    case "airtableTokenApi":
    case "facebookGraphApi":
    case "slackApi":
      return { accessToken: s(payload.accessToken) };
    case "discordWebhookApi": {
      const meta = (payload.metadata ?? {}) as { webhook?: { url?: string } };
      return { webhookUri: s(meta.webhook?.url ?? payload.webhookUri) };
    }
    case "telegramApi":
      return { accessToken: s(payload.botToken) };
    case "trelloApi":
      return { apiKey: s(payload.apiKey), apiToken: s(payload.apiToken) };
    case "shopifyAccessTokenApi":
      return { shopSubdomain: s(payload.shopSubdomain), accessToken: s(payload.accessToken), appSecretKey: s(payload.appSecretKey) };
    case "wooCommerceApi":
      return { url: s(payload.url), consumerKey: s(payload.consumerKey), consumerSecret: s(payload.consumerSecret), includeCredentialsInQuery: false };
    case "smtp":
      return { user: s(payload.user), password: s(payload.password), host: s(payload.host), port: Number(payload.port ?? 465), secure: payload.secure !== false && payload.secure !== "false" };
    case "whatsAppApi":
      return { accessToken: s(payload.accessToken), businessAccountId: s(payload.businessAccountId) };
    case "stripeApi":
      return { secretKey: s(payload.secretKey ?? payload.accessToken) };
    default:
      return payload;
  }
}
