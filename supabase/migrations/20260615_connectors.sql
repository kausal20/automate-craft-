-- Connectors full & final (18 Nov 2026).
--
-- 1. custom_mcp_connectors: a user's own remote MCP servers ("Add your own
--    connector"). Per-user only. The key/token is NOT here — it lives in the
--    encrypted credentials_vault (integration 'custom_mcp', name = connector id).
-- 2. agent_activity: allow 'tool_call' entries (plain-language record of each
--    custom tool call made by an automation).
-- Store connections need no schema change: connections / credentials_vault key
-- on a free-text integration, and one Google/Microsoft/Meta row covers its apps.

create table if not exists public.custom_mcp_connectors (
  id           uuid primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  url          text not null check (url like 'https://%'),
  auth_type    text not null default 'none' check (auth_type in ('none', 'bearer', 'header')),
  header_name  text,
  status       text not null default 'connected' check (status in ('connected', 'needs_reconnect')),
  last_error   text,
  tools        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);
create index if not exists custom_mcp_connectors_user_idx on public.custom_mcp_connectors (user_id, created_at);

alter table public.custom_mcp_connectors enable row level security;
drop policy if exists "custom_mcp_connectors_select_own" on public.custom_mcp_connectors;
create policy "custom_mcp_connectors_select_own" on public.custom_mcp_connectors
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: all writes go through the server (service role).

alter table public.agent_activity drop constraint if exists agent_activity_kind_check;
alter table public.agent_activity add constraint agent_activity_kind_check
  check (kind in ('built','test_passed','test_failed','turned_on','paused','resumed','connection_lost','build_blocked','tool_call'));
