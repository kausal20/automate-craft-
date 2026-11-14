/**
 * POST /api/agent/preview  { prompt }
 * Step 1 of 2: plan + human preview + cost + questions. Builds nothing.
 */
import { getAgentService } from "@/lib/agent/production";
import { AgentUserError } from "@/lib/agent/production/errors";
import { readJson, withUser } from "@/lib/agent/production/http";

export async function POST(request: Request) {
  return withUser(async (userId) => {
    const body = await readJson(request);
    if (typeof body.prompt !== "string") throw new AgentUserError("bad_request", 400, "prompt missing");
    return getAgentService().preview({ userId, prompt: body.prompt });
  });
}
