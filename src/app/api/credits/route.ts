import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserCredits, listUsageLogsForUser } from "@/lib/credit-store";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [credits, usageHistory] = await Promise.all([
      getUserCredits(user.id),
      listUsageLogsForUser(user.id),
    ]);

    return NextResponse.json({
      planCredits: credits.planCredits,
      extraCredits: credits.extraCredits,
      totalCredits: credits.totalCredits,
      monthlyUsage: credits.monthlyUsage,
      hasSubscription: credits.hasSubscription,
      usageHistory, // Added for the Usage History Table
    });
  } catch (error) {
    console.error("Failed to fetch credits:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
