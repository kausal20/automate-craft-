/**
 * AgentSessionRepo implementation (P0-3).
 *
 * Persists the entire AgentSession — intent, clarification state (questions +
 * answers), plan, workflow IR + version, validation/test/monitoring reports,
 * memory (connections, preferences, prior workflows, deployments), and the
 * current state machine state — so a conversation restores exactly after a
 * browser refresh, navigation, or reconnect.
 *
 * Dual-mode, matching every other repo in the codebase:
 *   - Supabase mode: one row per session in `agent_sessions`, the full
 *     session stored as a single JSONB `data` column (artifacts are deeply
 *     nested + evolve per phase; a document column avoids schema churn while
 *     remaining queryable by id/user/state).
 *   - Local mode: `agentSessions` array in the JSON local store.
 *
 * The session id equals the chat conversation id, so the existing chat
 * persistence (Zustand + chat-messages) and the agent session restore in
 * lockstep under one key.
 */

import { isSupabaseMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import { createLogger } from "@/lib/logger";
import type { AgentSessionRepo } from "./interfaces";
import type { AgentSession } from "./models";

const log = createLogger("agent/repo");

function rowToSession(row: Record<string, unknown>): AgentSession {
  // `data` holds the full session document; top-level columns are mirrors
  // for querying. The document is the source of truth.
  return row.data as AgentSession;
}

class SupabaseLocalAgentSessionRepo implements AgentSessionRepo {
  async get(sessionId: string): Promise<AgentSession | null> {
    if (isSupabaseMode()) {
      const supabase = createSupabaseAdminClient();
      const res = await supabase
        .from("agent_sessions")
        .select("data")
        .eq("id", sessionId)
        .maybeSingle();
      if (res.error) {
        log.warn("agent_sessions get failed", { sessionId, error: res.error.message });
        return null;
      }
      return res.data ? rowToSession(res.data as Record<string, unknown>) : null;
    }

    const db = await readLocalDatabase();
    return db.agentSessions.find((s) => s.sessionId === sessionId) ?? null;
  }

  async save(session: AgentSession): Promise<AgentSession> {
    const next = { ...session, updatedAt: Date.now() };

    if (isSupabaseMode()) {
      const supabase = createSupabaseAdminClient();
      const res = await supabase
        .from("agent_sessions")
        .upsert(
          {
            id: next.sessionId,
            user_id: next.userId,
            state: next.state,
            data: next,
            updated_at: new Date(next.updatedAt).toISOString(),
          },
          { onConflict: "id" },
        )
        .select("data")
        .single();
      if (res.error) throw new Error(`agent_sessions save failed: ${res.error.message}`);
      return rowToSession(res.data as Record<string, unknown>);
    }

    await updateLocalDatabase((db) => {
      const idx = db.agentSessions.findIndex((s) => s.sessionId === next.sessionId);
      if (idx >= 0) db.agentSessions[idx] = next;
      else db.agentSessions.push(next);
      return db;
    });
    return next;
  }

  async patch(sessionId: string, patch: Partial<AgentSession>): Promise<AgentSession> {
    const current = await this.get(sessionId);
    if (!current) {
      throw new Error(`Cannot patch unknown agent session: ${sessionId}`);
    }
    return this.save({ ...current, ...patch });
  }
}

/** Singleton repo — stateless, safe to share. */
export const agentSessionRepo: AgentSessionRepo = new SupabaseLocalAgentSessionRepo();
