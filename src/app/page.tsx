import HeroSection from "@/components/HeroSection";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseMode } from "@/lib/env";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="relative min-h-screen bg-white">
      <HeroSection
        user={user}
        socialAuthEnabled={isSupabaseMode()}
        ssoEnabled={isSsoEnabled()}
      />
    </main>
  );
}
