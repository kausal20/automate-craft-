import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { env, isSupabaseMode } from "@/lib/env";

function getPublicConfig() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Supabase public environment variables are missing.");
  }

  return {
    url: env.supabaseUrl,
    key: env.supabasePublishableKey,
  };
}

export async function createSupabaseServerComponentClient() {
  const { url, key } = getPublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies even when they cannot mutate them.
        }
      },
    },
  });
}

export async function createSupabaseRouteClient() {
  const { url, key } = getPublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export function createSupabaseAdminClient() {
  if (!isSupabaseMode() || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase admin client is not configured.");
  }

  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
