import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import WatchdogBanner from "@/components/dashboard/WatchdogBanner";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  /* LOGIC EXPLAINED:
  Dashboard routes share one shell so navigation, user profile, and credits stay
  consistent across projects, logs, apps, settings, and chat workspaces.
  */
  const user = await requireUser();

  return (
    <DashboardShell user={user}>
      <WatchdogBanner />
      {children}
    </DashboardShell>
  );
}
