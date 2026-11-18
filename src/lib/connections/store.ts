/**
 * The connector store — one source of truth for every first-class app.
 *
 * Two layers:
 *   - ACCOUNTS: what the user signs in to ONCE (google, microsoft, meta, slack, ...).
 *     One connection row + one vault credential + one n8n credential per account.
 *   - APPS: what the agent plans with (gmail, google_calendar, sheets, outlook, ...).
 *     Every app is backed by exactly one account.
 *
 * Gmail, Calendar, Drive, Sheets and Forms are separate apps in the catalogue
 * but all use the ONE Google connection. Same for Microsoft (Outlook mail +
 * calendar) and Meta (Pages, Lead Ads, Instagram).
 */

import type { SupportedIntegration } from "@/lib/workflow";

export type StoreAuthKind = "oauth2" | "api_key" | "bot_token" | "no_auth";

export interface StoreAccount {
  slug: SupportedIntegration;
  displayName: string;
  tagline: string;
  authKind: StoreAuthKind;
  /** Least-privilege scopes requested for this account (union of its apps' needs). */
  scopes: readonly string[];
  /** n8n credential type the account syncs to, or null when n8n has none. */
  n8nCredentialType: string | null;
  docsUrl: string;
  /** What the user is asked for when the account is API-key / bot-token based. */
  credentialFields?: readonly string[];
}

export interface StoreApp {
  slug: SupportedIntegration;
  displayName: string;
  tagline: string;
  account: SupportedIntegration;
  /** Was in the June catalogue (keeps its original trigger behaviour). */
  legacy?: boolean;
}

/* ── Google: the scope set (one sign-in) ───────────────────────────── */

export const GOOGLE_SCOPES = [
  // kept from the existing connection
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/forms.responses.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  // Gmail: read + send only (NOT full mail access)
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  // Calendar: read + create events
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  // Drive write: narrowest scope — only files this app creates or the user opens with it
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
  "profile",
] as const;

export const MICROSOFT_SCOPES = ["offline_access", "User.Read", "Mail.Read", "Mail.Send", "Calendars.ReadWrite"] as const;

export const META_SCOPES = ["pages_show_list", "pages_read_engagement", "leads_retrieval", "instagram_basic"] as const;

/* ── Accounts (sign in once) ──────────────────────────────────────── */

const ACCOUNTS: StoreAccount[] = [
  { slug: "google", displayName: "Google", tagline: "One sign-in for Gmail, Calendar, Drive, Sheets and Forms.", authKind: "oauth2", scopes: GOOGLE_SCOPES, n8nCredentialType: "googleOAuth2Api", docsUrl: "https://developers.google.com/identity/protocols/oauth2" },
  { slug: "microsoft", displayName: "Microsoft", tagline: "One sign-in for Outlook mail and Outlook calendar.", authKind: "oauth2", scopes: MICROSOFT_SCOPES, n8nCredentialType: "microsoftOAuth2Api", docsUrl: "https://learn.microsoft.com/graph/auth-v2-user" },
  { slug: "meta", displayName: "Meta (Facebook & Instagram)", tagline: "One sign-in for Facebook Pages, Lead Ads and Instagram.", authKind: "oauth2", scopes: META_SCOPES, n8nCredentialType: "facebookGraphApi", docsUrl: "https://developers.facebook.com/docs/facebook-login" },
  { slug: "slack", displayName: "Slack", tagline: "Read and post in the channels you pick.", authKind: "oauth2", scopes: ["chat:write", "channels:read", "channels:history", "users:read"], n8nCredentialType: "slackApi", docsUrl: "https://api.slack.com/authentication/oauth-v2" },
  { slug: "hubspot", displayName: "HubSpot", tagline: "Contacts and deals in HubSpot CRM.", authKind: "oauth2", scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.read", "crm.objects.deals.write"], n8nCredentialType: "hubspotOAuth2Api", docsUrl: "https://developers.hubspot.com/docs/api/oauth-quickstart-guide" },
  { slug: "salesforce", displayName: "Salesforce", tagline: "Leads in Salesforce.", authKind: "oauth2", scopes: ["api", "refresh_token", "offline_access"], n8nCredentialType: "salesforceOAuth2Api", docsUrl: "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm" },
  { slug: "zoho_crm", displayName: "Zoho CRM", tagline: "Leads and contacts in Zoho CRM.", authKind: "oauth2", scopes: ["ZohoCRM.modules.leads.ALL", "ZohoCRM.modules.contacts.ALL"], n8nCredentialType: "zohoOAuth2Api", docsUrl: "https://www.zoho.com/crm/developer/docs/api/v2/oauth-overview.html" },
  { slug: "pipedrive", displayName: "Pipedrive", tagline: "People and deals in Pipedrive.", authKind: "oauth2", scopes: ["contacts:full", "deals:full"], n8nCredentialType: "pipedriveOAuth2Api", docsUrl: "https://pipedrive.readme.io/docs/marketplace-oauth-authorization" },
  { slug: "asana", displayName: "Asana", tagline: "Tasks in Asana.", authKind: "oauth2", scopes: ["default"], n8nCredentialType: "asanaOAuth2Api", docsUrl: "https://developers.asana.com/docs/oauth" },
  { slug: "github", displayName: "GitHub", tagline: "Issues and repositories on GitHub.", authKind: "oauth2", scopes: ["repo"], n8nCredentialType: "githubOAuth2Api", docsUrl: "https://docs.github.com/apps/oauth-apps" },
  { slug: "notion", displayName: "Notion", tagline: "Pages and search in Notion.", authKind: "oauth2", scopes: [], n8nCredentialType: "notionApi", docsUrl: "https://developers.notion.com/docs/authorization" },
  { slug: "airtable", displayName: "Airtable", tagline: "Records in your Airtable bases.", authKind: "oauth2", scopes: ["data.records:read", "data.records:write", "schema.bases:read"], n8nCredentialType: "airtableTokenApi", docsUrl: "https://airtable.com/developers/web/guides/oauth-integrations" },
  { slug: "discord", displayName: "Discord", tagline: "Post messages to a Discord channel.", authKind: "oauth2", scopes: ["identify", "webhook.incoming"], n8nCredentialType: "discordWebhookApi", docsUrl: "https://discord.com/developers/docs/topics/oauth2" },
  { slug: "telegram", displayName: "Telegram", tagline: "Send messages with your Telegram bot.", authKind: "bot_token", scopes: [], n8nCredentialType: "telegramApi", docsUrl: "https://core.telegram.org/bots#how-do-i-create-a-bot", credentialFields: ["botToken"] },
  { slug: "trello", displayName: "Trello", tagline: "Cards on your Trello boards.", authKind: "api_key", scopes: [], n8nCredentialType: "trelloApi", docsUrl: "https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/", credentialFields: ["apiKey", "apiToken"] },
  { slug: "shopify", displayName: "Shopify", tagline: "Orders from your Shopify store.", authKind: "api_key", scopes: [], n8nCredentialType: "shopifyAccessTokenApi", docsUrl: "https://shopify.dev/docs/apps/auth/admin-app-access-tokens", credentialFields: ["shopSubdomain", "accessToken", "appSecretKey"] },
  { slug: "woocommerce", displayName: "WooCommerce", tagline: "Orders from your WooCommerce store.", authKind: "api_key", scopes: [], n8nCredentialType: "wooCommerceApi", docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication", credentialFields: ["url", "consumerKey", "consumerSecret"] },
  { slug: "whatsapp", displayName: "WhatsApp Business", tagline: "Send messages and templates via the WhatsApp Business API.", authKind: "api_key", scopes: [], n8nCredentialType: "whatsAppApi", docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api", credentialFields: ["accessToken", "businessAccountId"] },
  { slug: "email", displayName: "Email (SMTP)", tagline: "Send email from your own mailbox over SMTP.", authKind: "api_key", scopes: [], n8nCredentialType: "smtp", docsUrl: "https://docs.n8n.io/integrations/builtin/credentials/sendemail/", credentialFields: ["host", "port", "user", "password", "secure"] },
  { slug: "razorpay", displayName: "Razorpay", tagline: "Payments and orders on Razorpay.", authKind: "api_key", scopes: [], n8nCredentialType: null, docsUrl: "https://razorpay.com/docs/api/authentication/", credentialFields: ["keyId", "keySecret"] },
  { slug: "stripe", displayName: "Stripe", tagline: "Customers and payments on Stripe.", authKind: "api_key", scopes: [], n8nCredentialType: "stripeApi", docsUrl: "https://docs.stripe.com/keys", credentialFields: ["secretKey"] },
  { slug: "crm", displayName: "Generic CRM", tagline: "Placeholder for a CRM not in the store (no working actions).", authKind: "api_key", scopes: [], n8nCredentialType: null, docsUrl: "", credentialFields: ["apiKey"] },
  { slug: "webhook", displayName: "Webhooks / HTTP request", tagline: "Receive or send web requests.", authKind: "no_auth", scopes: [], n8nCredentialType: null, docsUrl: "" },
  { slug: "forms", displayName: "Forms", tagline: "Capture form submissions from any form tool.", authKind: "no_auth", scopes: [], n8nCredentialType: null, docsUrl: "" },
];

/* ── Apps (what automations use) ──────────────────────────────────── */

const APPS: StoreApp[] = [
  { slug: "gmail", displayName: "Gmail", tagline: "Read and send email.", account: "google" },
  { slug: "google_calendar", displayName: "Google Calendar", tagline: "Read events and create new ones.", account: "google" },
  { slug: "google", displayName: "Google Drive", tagline: "List files and save new files.", account: "google", legacy: true },
  { slug: "sheets", displayName: "Google Sheets", tagline: "Read, add and update rows.", account: "google", legacy: true },
  { slug: "google_forms", displayName: "Google Forms", tagline: "Read form responses.", account: "google" },
  { slug: "outlook", displayName: "Outlook Mail", tagline: "Read and send email.", account: "microsoft" },
  { slug: "outlook_calendar", displayName: "Outlook Calendar", tagline: "Read events and create new ones.", account: "microsoft" },
  { slug: "facebook_pages", displayName: "Facebook Pages", tagline: "Read your Page's posts.", account: "meta" },
  { slug: "facebook_lead_ads", displayName: "Facebook Lead Ads", tagline: "Read leads from your lead forms.", account: "meta" },
  { slug: "instagram", displayName: "Instagram", tagline: "Read your Instagram media.", account: "meta" },
  { slug: "slack", displayName: "Slack", tagline: "Read and post in channels you pick.", account: "slack", legacy: true },
  { slug: "telegram", displayName: "Telegram", tagline: "Send messages with your bot.", account: "telegram" },
  { slug: "email", displayName: "Email (SMTP)", tagline: "Send email from your mailbox.", account: "email", legacy: true },
  { slug: "whatsapp", displayName: "WhatsApp Business", tagline: "Send messages and templates.", account: "whatsapp", legacy: true },
  { slug: "hubspot", displayName: "HubSpot", tagline: "Contacts and deals.", account: "hubspot", legacy: true },
  { slug: "salesforce", displayName: "Salesforce", tagline: "Leads.", account: "salesforce", legacy: true },
  { slug: "zoho_crm", displayName: "Zoho CRM", tagline: "Leads and contacts.", account: "zoho_crm" },
  { slug: "pipedrive", displayName: "Pipedrive", tagline: "People and deals.", account: "pipedrive" },
  { slug: "trello", displayName: "Trello", tagline: "Create and list cards.", account: "trello" },
  { slug: "asana", displayName: "Asana", tagline: "Create and list tasks.", account: "asana" },
  { slug: "github", displayName: "GitHub", tagline: "Issues and repositories.", account: "github" },
  { slug: "notion", displayName: "Notion", tagline: "Create pages and search.", account: "notion" },
  { slug: "airtable", displayName: "Airtable", tagline: "Create and list records.", account: "airtable" },
  { slug: "discord", displayName: "Discord", tagline: "Post messages to a channel.", account: "discord" },
  { slug: "shopify", displayName: "Shopify", tagline: "Read orders.", account: "shopify" },
  { slug: "woocommerce", displayName: "WooCommerce", tagline: "Read orders.", account: "woocommerce" },
  { slug: "razorpay", displayName: "Razorpay", tagline: "Orders and payments.", account: "razorpay", legacy: true },
  { slug: "stripe", displayName: "Stripe", tagline: "Customers and payments.", account: "stripe", legacy: true },
  { slug: "crm", displayName: "Generic CRM", tagline: "No working actions yet.", account: "crm", legacy: true },
  { slug: "webhook", displayName: "Webhooks / HTTP request", tagline: "Receive or send web requests.", account: "webhook", legacy: true },
  { slug: "forms", displayName: "Forms", tagline: "Capture form submissions.", account: "forms", legacy: true },
];

const ACCOUNT_BY_SLUG = new Map(ACCOUNTS.map((a) => [a.slug, a]));
const APP_BY_SLUG = new Map(APPS.map((a) => [a.slug, a]));

export function listStoreAccounts(): readonly StoreAccount[] {
  return ACCOUNTS;
}
export function listStoreApps(): readonly StoreApp[] {
  return APPS;
}
export function storeAccount(slug: string): StoreAccount | undefined {
  return ACCOUNT_BY_SLUG.get(slug as SupportedIntegration);
}
export function storeApp(slug: string): StoreApp | undefined {
  return APP_BY_SLUG.get(slug as SupportedIntegration);
}

/** The account (connection) an app runs on. Unknown slugs map to themselves. */
export function accountFor(appOrAccount: string): string {
  return APP_BY_SLUG.get(appOrAccount as SupportedIntegration)?.account ?? appOrAccount;
}

/** Apps covered by one account (e.g. google -> Gmail, Calendar, Drive, Sheets, Forms). */
export function appsForAccount(account: string): StoreApp[] {
  return APPS.filter((a) => a.account === account);
}

/** Slugs that are sign-in accounts only, never planned with directly. */
export function isAccountOnly(slug: string): boolean {
  return ACCOUNT_BY_SLUG.has(slug as SupportedIntegration) && !APP_BY_SLUG.has(slug as SupportedIntegration);
}
