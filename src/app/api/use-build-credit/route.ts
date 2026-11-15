import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { actionReference, getCreditService } from "@/lib/credits";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const r = await getCreditService().reserve({
      userId: user.id,
      amount: 5,
      referenceId: actionReference("build", request.headers.get("idempotency-key")),
      description: "Build automation",
    });

    if (!r.ok) {
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
