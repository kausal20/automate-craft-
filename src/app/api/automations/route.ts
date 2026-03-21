import { getCurrentUser } from "@/lib/auth";
import {
  listAutomationsForUser,
  listRunsForUser,
} from "@/lib/automation-store";
import { jsonError } from "@/lib/api";

/* LOGIC EXPLAINED:
The dashboard asks this route for the automation list. The logs make it clear
whether the request reached the server, whether auth worked, and how many
automations and runs were found before the summary is returned.
*/

export async function GET() {
  console.log("[api/automations] Request received.");
  const user = await getCurrentUser();

  if (!user) {
    console.log("[api/automations] No authenticated user found.");
    return jsonError("Authentication required.", 401);
  }

  try {
    console.log("[api/automations] Authenticated user:", user.id);
    const [automations, runs] = await Promise.all([
      listAutomationsForUser(user.id),
      listRunsForUser(user.id),
    ]);
    console.log("[api/automations] Found automations:", automations.length);
    console.log("[api/automations] Found runs:", runs.length);

    const summaries = automations.map((automation) => {
      const matchingRuns = runs.filter(
        (run) => run.automationId === automation.id,
      );
      const lastRun = matchingRuns[0] ?? null;

      return {
        ...automation,
        runsCount: matchingRuns.length,
        lastRunAt: lastRun?.createdAt ?? null,
        lastRunStatus: lastRun?.status ?? null,
      };
    });

    return Response.json({ automations: summaries });
  } catch (error) {
    console.error("[api/automations] Request failed.", error);
    return jsonError(
      error instanceof Error ? error.message : "Could not load automations.",
      400,
    );
  }
}
