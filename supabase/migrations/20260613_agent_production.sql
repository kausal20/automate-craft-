-- Production agent: drafts (preview -> confirm), agent automations, plain-language activity log.
-- Separate from public.automations on purpose: the legacy store parses status as active|paused only.
-- All writes happen server-side with the service role; users may only read their own rows.

create table if not exists public.agent_drafts (
  id                   uuid primary key,
  user_id              uuid not null references public.profiles (id) on delete cascade,
  status               text not null check (status in ('needs_input','needs_connection','ready','rejected','building','built','failed_test')),
  language             text not null default 'en',
  prompt               text not null,
  plan                 jsonb,
  apps_required        text[] not null default '{}',
  questions            jsonb not null default '[]'::jsonb,
  answers              jsonb not null default '{}'::jsonb,
  selections           jsonb not null default '[]'::jsonb,
  cost_estimate        integer not null default 0 check (cost_estimate >= 0),
  rejection_reason     text,
  unsupported_requests jsonb not null default '[]'::jsonb,
  automation_id        uuid,
  build_attempt        integer not null default 0,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now())
);
create index if not exists agent_drafts_user_idx on public.agent_drafts (user_id, created_at desc);

create table if not exists public.agent_automations (
  id                    uuid primary key,
  user_id               uuid not null references public.profiles (id) on delete cascade,
  draft_id              uuid not null unique references public.agent_drafts (id) on delete cascade,
  name                  text not null,
  language              text not null default 'en',
  status                text not null check (status in ('building','failed_test','active','paused','needs_attention')),
  apps_required         text[] not null default '{}',
  connection_selections jsonb not null default '[]'::jsonb,
  n8n_workflow_id       text,
  test_execution_id     text,
  last_message          text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now())
);
create index if not exists agent_automations_user_idx on public.agent_automations (user_id, created_at desc);
create unique index if not exists agent_automations_n8n_uniq on public.agent_automations (n8n_workflow_id) where n8n_workflow_id is not null;

create table if not exists public.agent_activity (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  automation_id uuid not null references public.agent_automations (id) on delete cascade,
  kind          text not null check (kind in ('built','test_passed','test_failed','turned_on','paused','resumed','connection_lost','build_blocked')),
  message       text not null,
  created_at    timestamptz not null default timezone('utc', now())
);
create index if not exists agent_activity_automation_idx on public.agent_activity (automation_id, created_at);

alter table public.agent_drafts enable row level security;
alter table public.agent_automations enable row level security;
alter table public.agent_activity enable row level security;

drop policy if exists "agent_drafts_select_own" on public.agent_drafts;
create policy "agent_drafts_select_own" on public.agent_drafts for select using (auth.uid() = user_id);
drop policy if exists "agent_automations_select_own" on public.agent_automations;
create policy "agent_automations_select_own" on public.agent_automations for select using (auth.uid() = user_id);
drop policy if exists "agent_activity_select_own" on public.agent_activity;
create policy "agent_activity_select_own" on public.agent_activity for select using (auth.uid() = user_id);
