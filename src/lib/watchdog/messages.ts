/**
 * Plain-words alert text. ONE place for every sentence an owner can read.
 * Rules: no error codes, no JSON, no developer words. Short, warm, says what to do.
 *
 * Hindi strings are a first draft — have a native Hindi reader approve them
 * before they ship to customers.
 */

import type { ReasonCode } from "./health";

export type Lang = "en" | "hi";

export interface AlertText {
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
}

export interface AlertContext {
  reason: ReasonCode;
  automationId: string;
  automationName: string;
  /** From the health verdict `detail`. */
  detail?: Record<string, unknown>;
  lang?: Lang;
}

const APP_NAMES: Record<string, string> = {
  indiamart: "IndiaMART",
  whatsapp: "WhatsApp",
  googlesheets: "Google Sheets",
  google_sheets: "Google Sheets",
  gmail: "Gmail",
  razorpay: "Razorpay",
  zoho: "Zoho",
  slack: "Slack",
};

export function prettyAppName(key: string): string {
  const k = key.toLowerCase();
  if (APP_NAMES[k]) return APP_NAMES[k];
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function appList(detail?: Record<string, unknown>): string {
  const apps = Array.isArray(detail?.apps) ? (detail!.apps as unknown[]) : [];
  const names = apps.filter((a): a is string => typeof a === "string").map(prettyAppName);
  if (names.length === 0) return "one of your apps";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function describeAlert(ctx: AlertContext): AlertText {
  const lang: Lang = ctx.lang ?? "en";
  const name = ctx.automationName.trim() || "Your automation";
  const fixApps = "/dashboard/apps";
  const openIt = `/dashboard/automations/${ctx.automationId}`;

  switch (ctx.reason) {
    case "app_disconnected": {
      const apps = appList(ctx.detail);
      return lang === "hi"
        ? {
            title: `${name} रुक गया है`,
            body: `${apps} का कनेक्शन टूट गया है। जब तक इसे दोबारा नहीं जोड़ेंगे, यह ऑटोमेशन काम नहीं करेगा। इसमें 1 मिनट लगता है।`,
            actionLabel: "अभी दोबारा जोड़ें",
            actionHref: fixApps,
          }
        : {
            title: `${name} has stopped`,
            body: `Your ${apps} connection has stopped working, so this automation can't run. Reconnecting takes about 1 minute.`,
            actionLabel: "Reconnect now",
            actionHref: fixApps,
          };
    }
    case "repeated_failures":
      return lang === "hi"
        ? {
            title: `${name} बार-बार फेल हो रहा है`,
            body: "पिछली 3 बार यह ऑटोमेशन पूरा नहीं हो पाया। हो सकता है कोई ऐप कनेक्शन या जानकारी बदल गई हो। एक बार देख लीजिए।",
            actionLabel: "देखें क्या हुआ",
            actionHref: openIt,
          }
        : {
            title: `${name} keeps failing`,
            body: "The last 3 times this ran, it did not finish. An app login or some information may have changed. Please take a quick look.",
            actionLabel: "See what happened",
            actionHref: openIt,
          };
    case "no_activity_24h":
      return lang === "hi"
        ? {
            title: `${name} में 24 घंटे से कोई काम नहीं हुआ`,
            body: "यह चालू है, लेकिन पिछले 24 घंटे में एक भी बार नहीं चला। हो सकता है नए लीड आना बंद हो गए हों। एक बार जाँच लें।",
            actionLabel: "जाँच करें",
            actionHref: openIt,
          }
        : {
            title: `${name} has been quiet for 24 hours`,
            body: "It is switched on, but has not run once in the last 24 hours. New leads may have stopped coming in. Please check.",
            actionLabel: "Check it now",
            actionHref: openIt,
          };
  }
}
