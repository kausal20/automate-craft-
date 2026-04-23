import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listCreditTransactions } from "@/lib/credit-store";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await listCreditTransactions(user.id);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Failed to fetch credit transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
