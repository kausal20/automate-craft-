/**
 * Value extractors — pull a typed value out of free user text.
 *
 * Each extractor returns the normalized value plus the matched span so the
 * engine can "consume" it (blank it out) before running the next extractor.
 * That consumption is what makes multi-answer parsing work: "phone +1 555…
 * and channel #sales" yields a phone for the phone question and a channel
 * for the channel question without either stealing the other's text.
 *
 * Extractors are deterministic and side-effect free.
 */

import type { ClarificationValueType } from "../models/clarification";

export interface Extraction {
  value: string | string[];
  /** [start, end) indices in the source string that were matched. */
  span: [number, number];
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/;
const CHANNEL_HASH_RE = /#[a-z0-9_-]+/i;
const CHANNEL_NAMED_RE =
  /\b(?:channel|group|workspace)\s+(?:named|called)\s+["']?([a-z0-9 _-]{2,40})["']?/i;
const URL_RE = /https?:\/\/[^\s]+/i;
const NAMED_RE = /\b(?:named|called)\s+["']?([a-z0-9 _-]{2,60})["']?/i;
const QUOTED_RE = /["']([^"']{1,80})["']/;
const FIELDS_RE =
  /\b(?:fields?|include|columns?)\b[:\s]*([a-z0-9 ,_+&-]{2,160})/i;

/* ── Bare proper-noun extraction (P0-2) ──────────────────────────────
 * Real users type "Use Leads Sheet", "Marketing Sheet", "Sales Pipeline",
 * "HR Folder", "CRM B" — no quotes, no "named". These patterns recover a
 * resource name from natural language without requiring punctuation.
 */
// Entity keywords, case-insensitive initial so "Marketing Sheet" and
// "Marketing sheet" both match while the NAME words stay case-sensitive.
const ENTITY_CI =
  "[Ss]heet|[Ss]preadsheet|[Ff]orm|[Ff]older|[Dd]rive|[Cc]hannel|[Pp]ipeline|[Pp]roject|[Dd]atabase|[Bb]ase|[Tt]eam|[Ww]orkspace|CRM|crm|[Bb]oard|[Dd]oc|[Dd]ocument|[Ll]ist|[Tt]able|[Ss]pace|[Ii]nbox|[Cc]alendar";

// A NAME word is Title-Case or ALLCAPS/number ("Leads", "Sales", "HR", "Q3").
// Requiring this blocks matches that run across lowercase connectors
// ("Slack when a form" no longer matches as a name).
const NAME_WORD = "[A-Z][A-Za-z0-9&'-]*";
const NAME_WORD_NEXT = "[A-Z0-9][A-Za-z0-9&'-]*";

// "<Name…> <Entity>"  → "Leads Sheet", "Sales Pipeline", "Contact Form"
const BARE_NAME_SUFFIX_RE = new RegExp(
  `\\b(${NAME_WORD}(?:\\s+${NAME_WORD_NEXT}){0,4}?\\s+(?:${ENTITY_CI}))\\b`,
);
// "<Entity> <Name>"   → "CRM B", "Pipeline 2", "Sheet Q3"
const BARE_NAME_PREFIX_RE = new RegExp(
  `\\b((?:${ENTITY_CI})\\s+${NAME_WORD_NEXT}(?:\\s+${NAME_WORD_NEXT}){0,3})\\b`,
);
// cue verb + Title-Case phrase (no entity word): "use Acme Corp", "select Northwind"
const CUE_NAME_RE = new RegExp(
  `\\b(?:[Uu]se|[Uu]sing|[Ss]elect|[Cc]hoose|[Pp]ick|[Ss]witch to|[Ss]et to)\\s+(${NAME_WORD}(?:\\s+${NAME_WORD_NEXT}){0,4})`,
);

// Leading filler that may precede a captured name ("Use", "Actually use", "a").
const LEADING_STOPWORD_RE =
  /^(use|using|a|an|the|when|whenever|to|in|on|from|and|with|via|select|choose|pick|actually|instead|please|set|switch|my|our|add|post|send|new)\s+/i;

/**
 * Generic type-words that are NOT a specific resource name. "Google Form"
 * names the platform, not the form — so it must NOT resolve trigger.source.
 * Compared case-insensitively against the full extracted phrase.
 */
const GENERIC_SOURCE_NAMES = new Set([
  "google form",
  "google forms",
  "google sheet",
  "google sheets",
  "a form",
  "the form",
  "new form",
  "a sheet",
  "the sheet",
  "new sheet",
  "form",
  "sheet",
  "spreadsheet",
  "webhook",
  "a webhook",
  "the webhook",
  "channel",
  "a channel",
  "the channel",
  "folder",
  "crm",
  "a crm",
  "the crm",
  "pipeline",
]);

function isGenericName(value: string): boolean {
  return GENERIC_SOURCE_NAMES.has(value.trim().toLowerCase());
}

/**
 * Extract a bare resource name (no quotes/"named" required). Tries entity-
 * suffix, then entity-prefix, then a cue-verb + Title-Case phrase. Rejects
 * generic type-words so platform names don't masquerade as resource names.
 */
function extractBareName(text: string): Extraction | null {
  for (const re of [BARE_NAME_SUFFIX_RE, BARE_NAME_PREFIX_RE, CUE_NAME_RE]) {
    const m = re.exec(text);
    if (!m) continue;

    let phrase = m[1];
    let start = m.index + m[0].indexOf(m[1]);

    // Trim leading filler ("Use", "Actually use", "a") while >1 token remains,
    // shifting the span start accordingly.
    let sw = LEADING_STOPWORD_RE.exec(phrase);
    while (sw && phrase.slice(sw[0].length).trim().length > 0) {
      phrase = phrase.slice(sw[0].length);
      start += sw[0].length;
      sw = LEADING_STOPWORD_RE.exec(phrase);
    }

    const value = phrase.trim();
    if (!value || isGenericName(value)) continue; // try the next pattern
    return { value, span: [start, start + value.length] };
  }
  return null;
}

/** Skip markers — user declines to answer. */
const SKIP_RE =
  /^(skip|any|anything|whatever|you choose|your choice|default|doesn'?t matter|no preference)\b/i;

/** Correction markers — user is replacing a prior answer. */
const CORRECTION_RE =
  /\b(actually|instead|correction|change (?:it|that|to)|no[, ]+(?:make|use|it'?s)|rather)\b/i;

export function looksLikeSkip(text: string): boolean {
  return SKIP_RE.test(text.trim());
}

export function looksLikeCorrection(text: string): boolean {
  return CORRECTION_RE.test(text);
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits.replace(/^\+/, "")}`;
}

/**
 * Extract a value of the requested type from `text`. Returns null when no
 * value of that type is present.
 */
export function extract(
  valueType: ClarificationValueType,
  text: string,
  options?: string[],
): Extraction | null {
  switch (valueType) {
    case "email": {
      const m = EMAIL_RE.exec(text);
      if (!m) return null;
      return { value: m[0].toLowerCase(), span: [m.index, m.index + m[0].length] };
    }

    case "phone": {
      const m = PHONE_RE.exec(text);
      if (m) return { value: normalizePhone(m[0]), span: [m.index, m.index + m[0].length] };
      // fall back to a named group ("sales alerts group")
      const named = CHANNEL_NAMED_RE.exec(text) ?? NAMED_RE.exec(text);
      if (named) return { value: named[1].trim(), span: [named.index, named.index + named[0].length] };
      return null;
    }

    case "channel": {
      const hash = CHANNEL_HASH_RE.exec(text);
      if (hash) return { value: hash[0], span: [hash.index, hash.index + hash[0].length] };
      const named = CHANNEL_NAMED_RE.exec(text);
      if (named) return { value: named[1].trim(), span: [named.index, named.index + named[0].length] };
      // bare name: "Sales Channel", "use Support Channel"
      return extractBareName(text);
    }

    case "url": {
      const m = URL_RE.exec(text);
      if (!m) return null;
      return { value: m[0], span: [m.index, m.index + m[0].length] };
    }

    case "identifier": {
      const url = URL_RE.exec(text);
      if (url) return { value: url[0], span: [url.index, url.index + url[0].length] };
      const quoted = QUOTED_RE.exec(text);
      if (quoted) return { value: quoted[1].trim(), span: [quoted.index, quoted.index + quoted[0].length] };
      const named = NAMED_RE.exec(text);
      if (named) return { value: named[1].trim(), span: [named.index, named.index + named[0].length] };
      // bare name: "Leads Sheet", "Marketing Sheet", "Contact Form", "Sales Pipeline"
      return extractBareName(text);
    }

    case "fieldList": {
      const m = FIELDS_RE.exec(text);
      if (!m) return null;
      const fields = m[1]
        .split(/[,+&]| and /i)
        .map((f) => f.trim())
        .filter(Boolean);
      if (fields.length === 0) return null;
      return { value: fields, span: [m.index, m.index + m[0].length] };
    }

    case "integration": {
      const lower = text.toLowerCase();
      if (options && options.length > 0) {
        for (const opt of options) {
          const idx = lower.indexOf(opt.toLowerCase());
          if (idx >= 0) return { value: opt, span: [idx, idx + opt.length] };
        }
      }
      // Fall back to a bare name so a non-listed provider ("CRM B",
      // "Acme CRM") still resolves rather than looping forever.
      return extractBareName(text);
    }

    case "enum": {
      if (!options || options.length === 0) return null;
      const lower = text.toLowerCase();
      for (const opt of options) {
        const idx = lower.indexOf(opt.toLowerCase());
        if (idx >= 0) return { value: opt, span: [idx, idx + opt.length] };
      }
      return null;
    }

    case "text":
    default: {
      const trimmed = text.trim();
      if (!trimmed) return null;
      // A bare answer to a single open question: take the whole message.
      const start = text.indexOf(trimmed);
      return { value: trimmed, span: [start, start + trimmed.length] };
    }
  }
}

/** Blank out a matched span so a later extractor can't re-match it. */
export function consumeSpan(text: string, span: [number, number]): string {
  return text.slice(0, span[0]) + " ".repeat(span[1] - span[0]) + text.slice(span[1]);
}
