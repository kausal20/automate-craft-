import HeroSection from "@/components/HeroSection";
import { isSsoEnabled, isSupabaseAuthEnabled } from "@/lib/env";

/**
 * Homepage — always public.
 *
 * If the user is already logged in, middleware redirects them to /dashboard
 * before this page ever renders. So we never need to check session here.
 * This keeps the homepage fast and stateless.
 */
export default function Home() {
  return (
    <main className="relative min-h-screen">
      <HeroSection
        user={null}
        socialAuthEnabled={isSupabaseAuthEnabled()}
        ssoEnabled={isSsoEnabled()}
      />
    </main>
  );
}
