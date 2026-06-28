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
      return null;
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
      return null;
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
      if (!options || options.length === 0) return null;
      const lower = text.toLowerCase();
      for (const opt of options) {
        const idx = lower.indexOf(opt.toLowerCase());
        if (idx >= 0) return { value: opt, span: [idx, idx + opt.length] };
      }
      return null;
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
