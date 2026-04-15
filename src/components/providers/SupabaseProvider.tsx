"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase-browser";

/* LOGIC EXPLAINED:
The app needed one Supabase client available globally without changing the UI.
This provider creates the shared browser client once, exposes it through
context, and refreshes the app when Supabase auth state changes so login/logout
status stays in sync across server and client components.
*/

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState<SupabaseClient | null>(() =>
    getSupabaseBrowserClient(),
  );

  useEffect(() => {
    if (!client || !isSupabaseBrowserConfigured()) {
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, router]);

  return (
    <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
  );
}

export function useSupabaseClient() {
  return useContext(SupabaseContext);
}
