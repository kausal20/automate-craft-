import HeroSection from "@/components/HeroSection";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseMode } from "@/lib/env";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function Home() {
  const user = await getCurrentUser();

  const content = (
    <HeroSection
      user={user}
      socialAuthEnabled={isSupabaseMode()}
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
    <main className="relative min-h-screen bg-white">
      {content}
    </main>
  );
}
