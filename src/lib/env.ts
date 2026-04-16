export const env = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-5",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openAccessMode: process.env.OPEN_ACCESS_MODE === "true",
  sessionSecret: process.env.SESSION_SECRET || "automatecraft-dev-session-secret",
} as const;

/* LOGIC EXPLAINED:
Supabase auth was previously treated as "configured" only when the service-role
key was present. That blocked normal email/password login even though Supabase
Auth only needs the public URL and publishable key. This fix separates public
auth mode from admin/database mode so sign up, login, and sessions work with
the provided frontend credentials, while admin-only database features still
check for the service-role key explicitly.
*/
export function isSupabaseAuthEnabled() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function isSupabaseMode() {
  return Boolean(isSupabaseAuthEnabled() && env.supabaseServiceRoleKey);
}

/** Enterprise SSO (Supabase SAML). Set NEXT_PUBLIC_ENABLE_SSO=false to hide until SAML is configured. */
export function isSsoEnabled() {
  return (
    isSupabaseAuthEnabled() && process.env.NEXT_PUBLIC_ENABLE_SSO !== "false"
  );
}

export function hasOpenAIKey() {
  return Boolean(env.openaiApiKey);
}

export function isOpenAccessMode() {
  return env.openAccessMode;
}
