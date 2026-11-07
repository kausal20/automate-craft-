import { redirect } from "next/navigation";

export default function UsagePageRedirect() {
  redirect("/dashboard/credits");
}
