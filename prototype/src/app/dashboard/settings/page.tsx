import { requireUser } from "@/lib/auth";
import { env, hasOpenAIKey, isSupabaseAuthEnabled, isSupabaseMode } from "@/lib/env";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const user = await requireUser();

  const systemInfo = {
    authMode: (isSupabaseAuthEnabled() ? "supabase" : "local") as "supabase" | "local",
    dbMode: (isSupabaseMode() ? "supabase" : "local") as "supabase" | "local",
    aiMode: (hasOpenAIKey() ? "openai" : "fallback") as "openai" | "fallback",
    aiModel: hasOpenAIKey() ? env.openaiModel : null,
    webhookBase: "/api/webhook/:id",
  };

  return <SettingsClient user={user} systemInfo={systemInfo} />;
}
