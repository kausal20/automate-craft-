create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  workflow jsonb not null,
  form_inputs jsonb not null default '{}'::jsonb,
  integration_status jsonb not null default '{}'::jsonb,
  webhook_id text not null unique,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('running', 'success', 'error')),
  logs jsonb not null default '[]'::jsonb,
  trigger_source text not null default 'manual' check (trigger_source in ('manual', 'webhook')),
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz
);

create table if not exists public.connected_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  integration text not null,
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, integration)
);

create index if not exists automations_user_id_idx
  on public.automations (user_id);

create index if not exists automations_webhook_id_idx
  on public.automations (webhook_id);

create index if not exists automation_runs_user_id_idx
  on public.automation_runs (user_id);

create index if not exists automation_runs_automation_id_idx
  on public.automation_runs (automation_id);

create index if not exists connected_integrations_user_id_idx
  on public.connected_integrations (user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_automations_updated_at on public.automations;
create trigger set_automations_updated_at
before update on public.automations
for each row
execute function public.set_updated_at();

drop trigger if exists set_connected_integrations_updated_at on public.connected_integrations;
create trigger set_connected_integrations_updated_at
before update on public.connected_integrations
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.connected_integrations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

drop policy if exists "automations_manage_own" on public.automations;
create policy "automations_manage_own"
on public.automations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "automation_runs_manage_own" on public.automation_runs;
create policy "automation_runs_manage_own"
on public.automation_runs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "connected_integrations_manage_own" on public.connected_integrations;
create policy "connected_integrations_manage_own"
on public.connected_integrations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
