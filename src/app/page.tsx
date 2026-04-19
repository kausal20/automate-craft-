import HeroSection from "@/components/HeroSection";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseAuthEnabled } from "@/lib/env";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { isGuestUser } from "@/lib/guest-access";

export default async function Home() {
  const user = await getCurrentUser();
  const authenticatedUser = user && !isGuestUser(user) ? user : null;

  const content = (
    <HeroSection
      user={authenticatedUser}
      socialAuthEnabled={isSupabaseAuthEnabled()}
      ssoEnabled={isSsoEnabled()}
    />
  );

  /* LOGIC EXPLAINED:
  The homepage now has two clear modes:
  - Public Home for visitors and guest-open-access users.
  - Authenticated Home for real signed-in users only.
  Credits button is in the DashboardShell sidebar so it shows on all pages.
  */
  if (authenticatedUser) {
    return (
      <DashboardShell user={authenticatedUser}>
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
