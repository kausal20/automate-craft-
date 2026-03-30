import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Unified API route error handler. Extracts a user-friendly message from
 * Zod validation errors, standard Errors, or falls back to a default.
 */
export function handleRouteError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred.",
  status = 400,
) {
  const message =
    error instanceof z.ZodError
      ? error.issues[0]?.message || fallbackMessage
      : error instanceof Error
        ? error.message
        : fallbackMessage;

  return jsonError(message, status);
}
