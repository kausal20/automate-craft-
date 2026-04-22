import { NextResponse } from "next/server";
import { getCurrentUser, signOutCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { isSupabaseMode } from "@/lib/env";

export async function POST() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isSupabaseMode()) {
      const adminAuthClient = createSupabaseAdminClient().auth.admin;
      const { error } = await adminAuthClient.deleteUser(user.id);
      
      if (error) {
        throw error;
      }
    }

    await signOutCurrentUser();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/auth/delete] Failed to delete user", error);
    return NextResponse.json(
      { error: "Could not delete account" },
      { status: 500 }
    );
  }
}
