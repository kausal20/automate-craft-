/**
 * One error-mapping layer for everything the owner sees.
 *
 * Plain language out (in the plan's language where we have a translation),
 * technical detail to server logs only. Nothing that leaves this file may
 * contain node names, error codes, HTTP statuses, stack traces or secrets.
 */

import { createLogger } from "@/lib/logger";

const log = createLogger("agent/production");

export type UserMessageKey =
  | "generic"
  | "not_found"
  | "unauthorized"
  | "bad_request"
  | "not_confirmed"
  | "needs_input"
  | "needs_connection"
  | "insufficient_credits"
  | "build_in_progress"
  | "engine_unavailable"
  | "build_failed"
  | "test_failed"
  | "test_failed_app"
  | "connection_failed"
  | "active"
  | "paused"
  | "resumed"
  | "connection_lost"
  | "cannot_resume";

type Lang = "en" | "hi" | "hinglish";

const MESSAGES: Record<UserMessageKey, Record<Lang, string>> = {
  generic: {
    en: "Something went wrong on our side. Nothing was charged. Please try again in a minute.",
    hinglish: "Hamari taraf se kuch gadbad ho gayi. Koi charge nahi laga. Ek minute baad dobara try karein.",
    hi: "हमारी तरफ़ से कुछ गड़बड़ हो गई। कोई चार्ज नहीं लगा। एक मिनट बाद फिर कोशिश करें।",
  },
  not_found: {
    en: "We couldn't find that. It may have been removed.",
    hinglish: "Yeh mil nahi raha. Shayad hata diya gaya hai.",
    hi: "यह नहीं मिला। शायद हटा दिया गया है।",
  },
  unauthorized: {
    en: "Please sign in to continue.",
    hinglish: "Aage badhne ke liye sign in karein.",
    hi: "आगे बढ़ने के लिए साइन इन करें।",
  },
  bad_request: {
    en: "Some details were missing or in the wrong format. Please check and try again.",
    hinglish: "Kuch details missing hain ya sahi format mein nahi hain. Check karke dobara try karein.",
    hi: "कुछ जानकारी छूट गई है या सही रूप में नहीं है। जाँच कर फिर कोशिश करें।",
  },
  not_confirmed: {
    en: "Nothing was built yet. Please confirm when you're happy with the plan.",
    hinglish: "Abhi kuch nahi banaya. Plan theek lage to confirm karein.",
    hi: "अभी कुछ नहीं बनाया। योजना ठीक लगे तो पुष्टि करें।",
  },
  needs_input: {
    en: "I need a few answers before I can build this.",
    hinglish: "Banane se pehle mujhe kuch jawab chahiye.",
    hi: "बनाने से पहले मुझे कुछ जवाब चाहिए।",
  },
  needs_connection: {
    en: "Please connect the apps below first. It only takes a minute, and you only do it once.",
    hinglish: "Pehle neeche diye apps connect karein. Ek minute lagta hai, aur sirf ek baar karna hai.",
    hi: "पहले नीचे दिए ऐप जोड़ें। एक मिनट लगता है, और सिर्फ़ एक बार करना है।",
  },
  insufficient_credits: {
    en: "You don't have enough credits to build this. Nothing was charged.",
    hinglish: "Isse banane ke liye credits kam hain. Koi charge nahi laga.",
    hi: "इसे बनाने के लिए क्रेडिट कम हैं। कोई चार्ज नहीं लगा।",
  },
  build_in_progress: {
    en: "Your automation is being built. This page will update when it's ready.",
    hinglish: "Aapka automation ban raha hai. Taiyaar hote hi yahan dikhega.",
    hi: "आपका ऑटोमेशन बन रहा है। तैयार होते ही यहाँ दिखेगा।",
  },
  engine_unavailable: {
    en: "Our automation service isn't reachable right now. Nothing was charged. Please try again soon.",
    hinglish: "Abhi hamari automation service se connect nahi ho pa raha. Koi charge nahi laga. Thodi der baad try karein.",
    hi: "अभी हमारी ऑटोमेशन सेवा से जुड़ नहीं पा रहे। कोई चार्ज नहीं लगा। थोड़ी देर बाद कोशिश करें।",
  },
  build_failed: {
    en: "I couldn't finish building this automation. It is switched off and your credits were returned.",
    hinglish: "Yeh automation poora nahi bana paya. Yeh band hai aur aapke credits wapas kar diye gaye.",
    hi: "यह ऑटोमेशन पूरा नहीं बन पाया। यह बंद है और आपके क्रेडिट लौटा दिए गए।",
  },
  test_failed: {
    en: "I ran a test and one step didn't work, so I kept the automation switched off. Your credits were returned.",
    hinglish: "Test chalaya, ek step kaam nahi kiya, isliye automation band rakha. Aapke credits wapas kar diye gaye.",
    hi: "टेस्ट चलाया, एक कदम काम नहीं किया, इसलिए ऑटोमेशन बंद रखा। आपके क्रेडिट लौटा दिए गए।",
  },
  test_failed_app: {
    en: "I ran a test and the {app} step didn't work, so I kept the automation switched off. Please check your {app} connection. Your credits were returned.",
    hinglish: "Test chalaya, {app} wala step kaam nahi kiya, isliye automation band rakha. Apna {app} connection check karein. Credits wapas kar diye gaye.",
    hi: "टेस्ट चलाया, {app} वाला कदम काम नहीं किया, इसलिए ऑटोमेशन बंद रखा। अपना {app} कनेक्शन जाँचें। क्रेडिट लौटा दिए गए।",
  },
  connection_failed: {
    en: "I couldn't use your {app} account. Please reconnect it and try again. Nothing was charged.",
    hinglish: "Aapka {app} account use nahi ho paya. Dobara connect karke try karein. Koi charge nahi laga.",
    hi: "आपका {app} खाता इस्तेमाल नहीं हो पाया। फिर से जोड़कर कोशिश करें। कोई चार्ज नहीं लगा।",
  },
  active: {
    en: "Your automation passed its test and is now switched on.",
    hinglish: "Aapka automation test mein pass ho gaya aur ab chalu hai.",
    hi: "आपका ऑटोमेशन टेस्ट में पास हो गया और अब चालू है।",
  },
  paused: {
    en: "Your automation is paused. Nothing will run until you switch it back on.",
    hinglish: "Aapka automation ruka hua hai. Wapas chalu karne tak kuch nahi chalega.",
    hi: "आपका ऑटोमेशन रुका हुआ है। वापस चालू करने तक कुछ नहीं चलेगा।",
  },
  resumed: {
    en: "Your automation is switched on again.",
    hinglish: "Aapka automation phir se chalu hai.",
    hi: "आपका ऑटोमेशन फिर से चालू है।",
  },
  connection_lost: {
    en: "Your {app} connection stopped working, so I paused this automation. Reconnect {app} and switch it back on.",
    hinglish: "Aapka {app} connection band ho gaya, isliye automation rok diya. {app} dobara connect karke chalu karein.",
    hi: "आपका {app} कनेक्शन बंद हो गया, इसलिए ऑटोमेशन रोक दिया। {app} फिर से जोड़कर चालू करें।",
  },
  cannot_resume: {
    en: "This automation can't be switched on yet. It needs to pass its test first.",
    hinglish: "Yeh automation abhi chalu nahi ho sakta. Pehle test pass hona zaroori hai.",
    hi: "यह ऑटोमेशन अभी चालू नहीं हो सकता। पहले टेस्ट पास होना ज़रूरी है।",
  },
};

export function normalizeLang(language: string | null | undefined): Lang {
  const l = (language ?? "").toLowerCase();
  if (l === "hinglish" || l === "hi-latn") return "hinglish";
  if (l === "hi" || l.startsWith("hi-")) return "hi";
  return "en";
}

export function userMessage(key: UserMessageKey, language?: string | null, vars: Record<string, string> = {}): string {
  const text = MESSAGES[key][normalizeLang(language)];
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

/** Errors the services throw on purpose. They carry a message key, never prose from a library. */
export class AgentUserError extends Error {
  readonly key: UserMessageKey;
  readonly httpStatus: number;
  constructor(key: UserMessageKey, httpStatus: number, technical?: string) {
    super(technical ?? key);
    this.name = "AgentUserError";
    this.key = key;
    this.httpStatus = httpStatus;
  }
}

const SECRET_PATTERNS: RegExp[] = [
  /\b(sk|pk|rk)[-_](live|test|proj|or)?[-_]?[A-Za-z0-9_-]{12,}/g,
  /\bAIza[0-9A-Za-z_-]{20,}/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, // JWT
  /\b(xox[abpr]-[A-Za-z0-9-]{10,})/g, // Slack
  /\bsb_(secret|publishable)_[A-Za-z0-9_-]{10,}/g,
  /((?:api[_-]?key|token|secret|password|authorization)["'\s:=]+)([^\s"',}]{6,})/gi,
];

/** Remove anything that looks like a secret before text reaches a log. */
export function redact(text: string): string {
  let out = text;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, (match, ...groups) => {
      // For the key=value pattern keep the label, hide the value.
      if (typeof groups[0] === "string" && /api|token|secret|password|authorization/i.test(groups[0])) {
        return `${groups[0]}[redacted]`;
      }
      return "[redacted]";
    });
  }
  return out;
}

/** Log technical detail safely. Never pass prompts or credential payloads here. */
export function logTechnical(event: string, context: Record<string, unknown>, error?: unknown): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    safe[k] = typeof v === "string" ? redact(v) : v;
  }
  if (error !== undefined) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    safe.error = redact(message);
  }
  log.warn(event, safe);
}

/** Map any thrown value to a safe HTTP payload. */
export function toUserResponse(error: unknown, language?: string | null): { status: number; body: { error: string } } {
  if (error instanceof AgentUserError) {
    return { status: error.httpStatus, body: { error: userMessage(error.key, language) } };
  }
  logTechnical("Unhandled agent error.", {}, error);
  return { status: 500, body: { error: userMessage("generic", language) } };
}
