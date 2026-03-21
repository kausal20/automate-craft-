export const env = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-5",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  sessionSecret: process.env.SESSION_SECRET || "automatecraft-dev-session-secret",
} as const;

export function isSupabaseMode() {
  return Boolean(
    env.supabaseUrl &&
      env.supabasePublishableKey &&
      env.supabaseServiceRoleKey,
  );
}

export function hasOpenAIKey() {
  return Boolean(env.openaiApiKey);
}
