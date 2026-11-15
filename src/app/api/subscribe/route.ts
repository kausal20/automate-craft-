import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { grantSubscriptionCredits } from "@/lib/credit-store";
import { planGrant } from "@/lib/plans";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    // Credit amounts come from the one plans config (src/lib/plans.ts).
    const config = typeof planId === "string" ? planGrant(planId) : null;
    if (!config) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const planName = config.name;
    const planCredits = config.credits;

    // Idempotent per user + plan + calendar month.
    const success = await grantSubscriptionCredits(user.id, planId);

    if (!success) {
      return NextResponse.json({ error: "Subscription failed" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      planId,
      planName,
      creditsGranted: planCredits,
    });
  } catch (error) {
    console.error("Failed to subscribe to plan:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
