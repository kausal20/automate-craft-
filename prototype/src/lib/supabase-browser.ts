"use client";

import { setSessionCookie } from "@/mock/session";

/**
 * PROTOTYPE MOCK of src/lib/supabase-browser.ts. The Supabase SDK is not
 * installed. Only the two calls the auth screens make are simulated.
 */
const mockClient = {
  auth: {
    async signInWithOAuth({
      options,
    }: {
      provider: string;
      options: { redirectTo: string; skipBrowserRedirect?: boolean };
    }) {
      setSessionCookie();
      const next = new URL(options.redirectTo).searchParams.get("next") || "/dashboard";
      return { data: { url: next }, error: null };
    },
    async resend(_input: { type: string; email: string; options?: { emailRedirectTo?: string } }) {
      return { data: {}, error: null };
    },
  },
};

export function isSupabaseBrowserConfigured() {
  return true;
}

export function getSupabaseBrowserClient() {
  return mockClient;
}
