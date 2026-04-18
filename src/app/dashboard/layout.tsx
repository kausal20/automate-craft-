import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  /* LOGIC EXPLAINED:
  The dashboard layout still protects authenticated routes, but the floating
  credits button is now mounted globally from the root layout through a single
  auth gate. That prevents duplicate button instances and keeps one condition
  for the whole website.
  */
  const user = await requireUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
