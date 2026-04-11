import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { isSupabaseMode } from "@/lib/env";
import { updateLocalDatabase } from "@/lib/local-store";
import { cookies } from "next/headers";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isSupabaseMode()) {
      const adminAuthClient = createSupabaseAdminClient();
      
      // The admin auth client automatically bypasses RLS and permanently wipes the user from auth.users.
      // Database triggers / cascading deletes on the Supabase side will handle cleaning up related tables.
      const { error } = await adminAuthClient.auth.admin.deleteUser(user.id);
      
      if (error) {
        console.error("Supabase User Deletion Error:", error);
        return NextResponse.json({ error: "Failed to delete user from auth provider" }, { status: 500 });
      }
    } else {
      // Local Mode: actively scrub everything linked to this user's ID
      await updateLocalDatabase(async (db) => {
        db.users = db.users.filter((u) => u.id !== user.id);
        
        const userAutoIds = db.automations
          .filter((a) => a.userId === user.id)
          .map((a) => a.id);
          
        db.automations = db.automations.filter((a) => !userAutoIds.includes(a.id));
        db.runs = db.runs.filter((r) => !userAutoIds.includes(r.automationId));
        return undefined;
      });
    }

    // Force sign out by deleting the local fallback cookie
    const cookieStore = await cookies();
    cookieStore.delete("automatecraft_local_session");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/user error:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
