import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buyCredits } from "@/lib/credit-store";

const PRICE_PER_CREDIT = 1.8;
const MAX_CUSTOM_PRICE_INR = 100000;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packageId, customCredits } = await request.json();

    let creditsToAdd = 0;
    let desc = "";

    if (packageId === "custom" && customCredits) {
      creditsToAdd = parseInt(customCredits, 10);
      if (creditsToAdd < 600) {
        return NextResponse.json({ error: "Minimum custom credit top-up is 600" }, { status: 400 });
      }
      const customPrice = Math.round(creditsToAdd * PRICE_PER_CREDIT);
      if (customPrice > MAX_CUSTOM_PRICE_INR) {
        return NextResponse.json(
          { error: "Maximum custom purchase is ₹1,00,000" },
          { status: 400 },
        );
      }
      desc = `${creditsToAdd} Credits Top-up (Custom)`;
    } else {
      switch (packageId) {
        case "pkg_600": creditsToAdd = 600; desc = "600 Credits Top-up"; break;
        case "pkg_3600": creditsToAdd = 3600; desc = "3600 Credits Top-up"; break;
        case "pkg_7200": creditsToAdd = 7200; desc = "7200 Credits Top-up"; break;
        case "pkg_14400": creditsToAdd = 14400; desc = "14400 Credits Top-up"; break;
        case "pkg_30000": creditsToAdd = 30000; desc = "30000 Credits Top-up"; break;
        default: return NextResponse.json({ error: "Invalid package" }, { status: 400 });
      }
    }

    const success = await buyCredits(user.id, creditsToAdd, desc);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to process purchase" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, creditsAdded: creditsToAdd });
  } catch (error) {
    console.error("Failed to buy credits:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
