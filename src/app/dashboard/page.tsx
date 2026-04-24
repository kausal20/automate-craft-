import { getCurrentUser } from "@/lib/auth";
import DashboardHomeClient from "@/components/dashboard/DashboardHomeClient";

/**
 * Dashboard home — server component so we can read the session and pass the
 * user's name to the client UI without an extra API call.
 */
export default async function DashboardHome() {
  const user = await getCurrentUser();
  const firstName = user?.name ? user.name.split(" ")[0] : null;

  return <DashboardHomeClient firstName={firstName} />;
}
