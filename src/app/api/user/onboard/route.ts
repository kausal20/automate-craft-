import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseMode } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase";
import { updateLocalDatabase } from "@/lib/local-store";

const onboardSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(100),
  role: z.string().min(1, "Role is required").max(50),
  companySize: z.string().min(1, "Company size is required").max(50),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = onboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data provided." }, { status: 400 });
    }

    const { fullName, role, companySize } = parsed.data;

    // Supabase Mode
    if (isSupabaseMode()) {
      const supabase = await createSupabaseRouteClient();
      
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          role,
          companySize,
          onboarded: true,
        }
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } 
    // Local Mode
    else {
      try {
        await updateLocalDatabase(async (db) => {
          const localUser = db.users.find((u) => u.id === user.id);
          if (localUser) {
            localUser.name = fullName;
            (localUser as any).role = role;
            (localUser as any).companySize = companySize;
            (localUser as any).onboarded = true;
          }
          return localUser;
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Could not update user" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
