/**
 * Route helpers for the agent API. The authenticated user comes from the
 * session only — a user id in the request body or query is never trusted.
 * Every failure is mapped to plain language by errors.ts.
 */

import { getCurrentUser } from "@/lib/auth";
import { AgentUserError, toUserResponse } from "./errors";

export async function withUser<T>(fn: (userId: string) => Promise<T>): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AgentUserError("unauthorized", 401, "no session");
    const result = await fn(user.id);
    return Response.json(result);
  } catch (error) {
    const { status, body } = toUserResponse(error);
    return Response.json(body, { status });
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AgentUserError("bad_request", 400, "body not an object");
  return body as Record<string, unknown>;
}
