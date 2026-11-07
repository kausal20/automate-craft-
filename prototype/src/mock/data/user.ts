import type { AuthenticatedUser } from "@/lib/automation";

/** Fictional person and workspace. Edit freely. */
export const DEMO_USER: AuthenticatedUser = {
  id: "demo-user",
  email: "maya@northwind-demo.test",
  name: "Maya Fernandes",
  mode: "supabase",
  onboarded: true,
  emailVerified: true,
};
