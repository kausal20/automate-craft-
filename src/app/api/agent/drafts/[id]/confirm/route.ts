/**
 * POST /api/agent/drafts/:id/confirm  { confirm: true, answers?: {key: value}, connections?: [{integration, connectionId}] }
 * Step 2 of 2. Builds only with explicit confirm === true. Idempotent: a second
 * confirm returns the existing result and never builds or charges twice.
 */
import { getAgentService } from "@/lib/agent/production";
import { AgentUserError } from "@/lib/agent/production/errors";
import { readJson, withUser } from "@/lib/agent/production/http";

export const maxDuration = 120;

function asAnswers(v: unknown): Record<string, string> {
  if (v === undefined) return {};
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new AgentUserError("bad_request", 400, "answers");
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) if (typeof val === "string") out[k.slice(0, 80)] = val.slice(0, 4000);
  return out;
}

function asSelections(v: unknown) {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new AgentUserError("bad_request", 400, "connections");
  return v
    .filter((s): s is { integration: string; connectionId: string } =>
      !!s && typeof s.integration === "string" && typeof s.connectionId === "string")
    .map((s) => ({ integration: s.integration, connectionId: s.connectionId }));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withUser(async (userId) => {
    const body = await readJson(request);
    return getAgentService().confirm({
      userId,
      draftId: id,
      confirm: body.confirm === true,
      answers: asAnswers(body.answers),
      selections: asSelections(body.connections),
    });
  });
}
