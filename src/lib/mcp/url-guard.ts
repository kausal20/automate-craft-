/**
 * MCP link validation — runs BEFORE any network call.
 *
 *  - Only https web links. A pasted command ("npx ...", "uvx ...") gets a plain
 *    message: local/stdio servers cannot be added.
 *  - SSRF protection: localhost, private, loopback, link-local, CGNAT,
 *    multicast and unique-local addresses are rejected — for IP literals AND
 *    for every address the hostname resolves to. Credentials in the URL are
 *    rejected. An explicit dev-only flag (never in production) allows private
 *    addresses for local testing.
 */

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export type Resolver = (hostname: string) => Promise<string[]>;

export const defaultResolver: Resolver = async (hostname) =>
  (await dnsLookup(hostname, { all: true, verbatim: true })).map((r) => r.address);

export type UrlCheck = { ok: true; url: URL } | { ok: false; message: string };

export const MSG_COMMAND = "Only a web link works here. A command that runs on your own computer cannot be added.";
export const MSG_NOT_URL = "That doesn't look like a web link. Paste the server's address, starting with https://.";
export const MSG_HTTPS = "For your safety, only secure links (https://) can be added.";
export const MSG_PRIVATE = "That link points to a private or local network address, which can't be added.";
export const MSG_RESOLVE = "We couldn't find that server. Check the link and try again.";

const COMMAND_RE = /^\s*(npx|npm|pnpm|yarn|bunx|uvx|uv|pip|pipx|python3?|node|deno|docker|bash|sh|cmd|powershell|\.\/|\/)\b/i;

export function privateAddressesAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MCP_ALLOW_PRIVATE_URLS === "true" && env.NODE_ENV !== "production";
}

function ipv4Private(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast + reserved
  );
}

export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return ipv4Private(ip);
  if (kind === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return ipv4Private(mapped[1]);
    if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
    if (/^ff/.test(lower)) return true; // multicast
    return false;
  }
  return true; // not an IP at all -> treat as unsafe
}

const BLOCKED_HOSTS = /^(localhost|.*\.localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i;

export async function checkMcpUrl(
  input: string,
  opts: { resolver?: Resolver; allowPrivate?: boolean } = {},
): Promise<UrlCheck> {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, message: MSG_NOT_URL };
  if (COMMAND_RE.test(raw) || (/\s/.test(raw) && !/^https?:\/\//i.test(raw))) return { ok: false, message: MSG_COMMAND };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: MSG_NOT_URL };
  }
  if (url.protocol !== "https:") return { ok: false, message: url.protocol === "http:" ? MSG_HTTPS : MSG_NOT_URL };
  if (url.username || url.password) return { ok: false, message: "Don't put a password inside the link. Enter it in the secure field instead." };

  const allowPrivate = opts.allowPrivate ?? privateAddressesAllowed();
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!allowPrivate && BLOCKED_HOSTS.test(host)) return { ok: false, message: MSG_PRIVATE };

  if (isIP(host)) {
    if (!allowPrivate && isPrivateAddress(host)) return { ok: false, message: MSG_PRIVATE };
    return { ok: true, url };
  }

  let addresses: string[];
  try {
    addresses = await (opts.resolver ?? defaultResolver)(host);
  } catch {
    return { ok: false, message: MSG_RESOLVE };
  }
  if (addresses.length === 0) return { ok: false, message: MSG_RESOLVE };
  if (!allowPrivate && addresses.some(isPrivateAddress)) return { ok: false, message: MSG_PRIVATE };
  return { ok: true, url };
}
