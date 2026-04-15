import HeroSection from "@/components/HeroSection";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseAuthEnabled } from "@/lib/env";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function Home() {
  const user = await getCurrentUser();

  const content = (
    <HeroSection
      user={user}
      socialAuthEnabled={isSupabaseAuthEnabled()}
      ssoEnabled={isSsoEnabled()}
    />
  );

  if (user) {
    return (
      <DashboardShell user={user}>
        {content}
      </DashboardShell>
    );
  }

  return (
    <main className="relative min-h-screen">
      {content}
    </main>
  );
}
