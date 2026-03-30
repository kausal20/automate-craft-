import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits } from "@/lib/credit-store";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    // Default rule
    let creditsToDeduct = 1;
    let actionDesc = "Executed Automation";

    if (action === "whatsapp") {
      creditsToDeduct = 2;
      actionDesc = "WhatsApp Sent";
    } else if (action === "email") {
      creditsToDeduct = 1;
      actionDesc = "Email Sent";
    }

    const success = await deductCredits(user.id, creditsToDeduct, actionDesc);

    if (!success) {
      return NextResponse.json(
        { error: "Not enough run credits" },
        { status: 402 }
      );
    }

    return NextResponse.json({ success: true, creditsToDeduct });
  } catch (error) {
    console.error("Failed to use run credit:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
