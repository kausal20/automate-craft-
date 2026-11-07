import { getCurrentUser } from "@/lib/auth";
import NavbarClient from "@/components/NavbarClient";
import { isGuestUser } from "@/lib/guest-access";

export default async function Navbar() {
  const user = await getCurrentUser();

  return <NavbarClient isAuthenticated={Boolean(user) && !isGuestUser(user)} />;
}
