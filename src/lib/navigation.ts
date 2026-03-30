const SAFE_PATH_PREFIXES = [
  "/dashboard",
  "/lets-talk",
  "/login",
  "/signup",
  "/",
];

/**
 * Sanitize a redirect path from user-controlled input (e.g. query params).
 * Blocks open-redirect attacks, control characters, and unicode tricks.
 */
export function sanitizeNextPath(value: string | null | undefined) {
  if (!value) {
    return "/dashboard";
  }

  // Strip control characters and unicode direction overrides
  const cleaned = value.replace(/[\x00-\x1f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");

  if (!cleaned.startsWith("/")) {
    return "/dashboard";
  }

  // Block protocol-relative URLs like //evil.com
  if (cleaned.startsWith("//")) {
    return "/dashboard";
  }

  // Block embedded backslash tricks (//evil.com via /\evil.com)
  if (cleaned.includes("\\")) {
    return "/dashboard";
  }

  // Ensure path starts with a known safe prefix
  const isSafe = SAFE_PATH_PREFIXES.some(
    (prefix) => cleaned === prefix || cleaned.startsWith(prefix + "/") || cleaned.startsWith(prefix + "?"),
  );

  if (!isSafe) {
    return "/dashboard";
  }

  return cleaned;
}
