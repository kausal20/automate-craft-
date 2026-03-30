import { requireUser } from "@/lib/auth";
import SetupEngine from "@/components/setup/SetupEngine";

export default async function SetupPage() {
  const user = await requireUser();
  return <SetupEngine user={user} />;
}
