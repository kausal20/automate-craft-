-- =============================================================================
-- Agent sessions — persistence for the Automation Agent pipeline.
-- -----------------------------------------------------------------------------
-- One row per automation-building session (id == chat conversation id). The
-- full AgentSession document (intent, clarification questions+answers, plan,
-- workflow IR, validation/test/monitoring reports, memory, current state)
-- lives in the JSONB `data` column. Top-level columns mirror queryable fields.
--
-- A document column is used because the artifacts are deeply nested and evolve
-- per pipeline phase; this avoids schema churn while keeping id/user/state
-- queryable. RLS restricts rows to their owner; the service role (admin
-- client) bypasses RLS for server-side orchestration.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id          TEXT         PRIMARY KEY,                       -- == chat conversation id
  user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state       TEXT         NOT NULL DEFAULT 'IDLE',
  data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user
  ON public.agent_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_state
  ON public.agent_sessions (user_id, state);

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_sessions_select_own ON public.agent_sessions;
CREATE POLICY agent_sessions_select_own
  ON public.agent_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS agent_sessions_modify_own ON public.agent_sessions;
CREATE POLICY agent_sessions_modify_own
  ON public.agent_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
