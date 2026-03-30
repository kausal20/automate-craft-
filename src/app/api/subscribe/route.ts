import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateLocalDatabase } from "@/lib/local-store";

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

    // Process subscription
    const success = await updateLocalDatabase((database) => {
      const dbUser = database.users.find((u) => u.id === user.id);
      const plan = database.plans.find((p) => p.id === planId);

      if (!dbUser || !plan) {
        return false;
      }

      // Add subscription record
      database.subscriptions.push({
        id: crypto.randomUUID(),
        userId: user.id,
        planId: plan.id,
        startDate: new Date().toISOString(),
        status: "active",
      });

      // Assign credits based on plan
      dbUser.planCredits = (dbUser.planCredits ?? 0) + plan.credits;

      // Log the usage entry as a positive increase
      if (plan.credits > 0) {
        database.usageLogs.unshift({
          id: crypto.randomUUID(),
          userId: user.id,
          action: `Subscribed to ${plan.name} Plan`,
          creditsUsed: 0,
          status: "Success",
          createdAt: new Date().toISOString(),
        });
      }

      return true;
    });

    if (!success) {
      return NextResponse.json({ error: "Subscription failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true, planId });
  } catch (error) {
    console.error("Failed to subscribe to plan:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
