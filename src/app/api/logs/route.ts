import { getCurrentUser } from "@/lib/auth";
import {
  listAutomationsForUser,
  listRunsForUser,
} from "@/lib/automation-store";
import { jsonError } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  try {
    const [automations, runs] = await Promise.all([
      listAutomationsForUser(user.id),
      listRunsForUser(user.id),
    ]);

    const nameMap = new Map(automations.map((entry) => [entry.id, entry.name]));

    return Response.json({
      logs: runs.map((run) => ({
        ...run,
        automationName: nameMap.get(run.automationId) ?? "Unknown automation",
      })),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not load logs.",
      400,
    );
  }
}
