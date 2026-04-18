import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser({ allowUnverified: true });
  return Response.json({
    user,
    emailVerified: !!user?.emailVerified,
  });
}
