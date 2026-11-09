import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runWatchdogChecks } from "@/lib/watchdog/run-checks";

// Checking many automations can take a while; the platform default may be too short.
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed: no secret configured means nobody may call this.
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Called by Vercel Cron (it sends `Authorization: Bearer $CRON_SECRET`) or by an
 * external pinger with the same header. Not cached: it reads request headers.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("watchdog cron: CRON_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const summary = await runWatchdogChecks();
    return NextResponse.json({ success: true, tookMs: Date.now() - startedAt, ...summary });
  } catch (error) {
    console.error("watchdog cron failed:", error);
    return NextResponse.json({ success: false, error: "Watchdog run failed" }, { status: 500 });
  }
}
