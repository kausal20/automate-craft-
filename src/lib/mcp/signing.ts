/**
 * Signed step tokens for custom MCP tool calls.
 *
 * n8n has no credential type for a user's MCP server, so a workflow step calls
 * OUR backend (/api/connectors/mcp/execute) with a token bound to
 * user + connector + tool (+ automation). The backend verifies the token, then
 * calls the tool with the vault credential. A token can call nothing else.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface ToolCallClaims {
  userId: string;
  connectorId: string;
  tool: string;
  automationId: string | null;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function signToolCall(claims: ToolCallClaims, secret: string): string {
  if (!secret || secret.length < 16) throw new Error("MCP_EXEC_SECRET is missing or too short.");
  const body = b64url(Buffer.from(JSON.stringify([claims.userId, claims.connectorId, claims.tool, claims.automationId])));
  const sig = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToolCall(token: string, secret: string): ToolCallClaims | null {
  if (!secret || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const [userId, connectorId, tool, automationId] = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof userId !== "string" || typeof connectorId !== "string" || typeof tool !== "string") return null;
    return { userId, connectorId, tool, automationId: typeof automationId === "string" ? automationId : null };
  } catch {
    return null;
  }
}
