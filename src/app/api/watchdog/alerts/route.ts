import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listOpenAlertsForUser } from "@/lib/watchdog/alerts";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const alerts = await listOpenAlertsForUser(user.id);
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Failed to load watchdog alerts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
