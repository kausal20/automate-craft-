import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { grantSubscriptionCredits } from "@/lib/credit-store";

// Plan configuration — credits granted per plan
const PLAN_CONFIG: Record<string, { name: string; credits: number }> = {
  plan_starter: { name: "Starter", credits: 500 },
  plan_starter_yearly: { name: "Starter (Yearly)", credits: 6000 },
  plan_plus: { name: "Plus", credits: 1500 },
  plan_plus_yearly: { name: "Plus (Yearly)", credits: 18000 },
  plan_pro: { name: "Pro", credits: 3000 },
  plan_pro_yearly: { name: "Pro (Yearly)", credits: 36000 },
};

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

    // Look up plan configuration
    const config = PLAN_CONFIG[planId];
    if (!config) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const planName = config.name;
    const planCredits = config.credits;

    const success = await grantSubscriptionCredits(
      user.id,
      planId,
      planName,
      planCredits,
    );

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
