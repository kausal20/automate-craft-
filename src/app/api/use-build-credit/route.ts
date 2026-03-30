import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deductCredits } from "@/lib/credit-store";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await deductCredits(user.id, 5, "Build automation");

    if (!success) {
      return NextResponse.json(
        { error: "Not enough build credits" },
        { status: 402 } // Payment Required
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to use build credit:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
