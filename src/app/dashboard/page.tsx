import { redirect } from "next/navigation";

/* LOGIC EXPLAINED:
The dashboard root was redirecting back to the homepage, which made it look like
dashboard-only UI such as the floating credits button had disappeared after
deploy. Redirecting to the real dashboard workspace keeps users inside the
authenticated app shell where shared app controls are mounted.
*/
export default function DashboardRedirect() {
  redirect("/dashboard/projects");
}
