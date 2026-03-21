import { getCurrentUser } from "@/lib/auth";
import NavbarClient from "@/components/NavbarClient";

export default async function Navbar() {
  const user = await getCurrentUser();

  return <NavbarClient isAuthenticated={Boolean(user)} />;
}
