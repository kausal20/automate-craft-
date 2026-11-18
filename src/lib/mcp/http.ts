/**
 * Route helpers for /api/connectors/mcp. The user always comes from the
 * session; plain-language errors only; secrets never echoed back.
 */

import { getCurrentUser } from "@/lib/auth";
import type { McpAuth } from "./client";
import { McpUserError } from "./service";

export async function withSessionUser(fn: (userId: string) => Promise<unknown>): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
    return Response.json(await fn(user.id));
  } catch (error) {
    if (error instanceof McpUserError) return Response.json({ error: error.plain }, { status: error.status });
    console.error("custom connector route failed:", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "Something went wrong on our side. Nothing was saved." }, { status: 500 });
  }
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object" || Array.isArray(b)) throw new McpUserError("Some details were missing.");
  return b as Record<string, unknown>;
}

/** Parse the secure auth fields. Never logged, never returned. */
export function parseAuth(v: unknown): McpAuth {
  if (v === undefined || v === null) return { type: "none" };
  const a = v as Record<string, unknown>;
  if (a.type === "none" || a.type === undefined) return { type: "none" };
  if (a.type === "bearer" && typeof a.token === "string" && a.token.trim()) return { type: "bearer", token: a.token.trim().slice(0, 4096) };
  if (a.type === "header" && typeof a.headerName === "string" && typeof a.value === "string" && a.value.trim()) {
    return { type: "header", headerName: a.headerName.trim().slice(0, 64), value: a.value.trim().slice(0, 4096) };
  }
  throw new McpUserError("Please fill in the key or token, or choose “no key needed”.");
}

export function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
}
