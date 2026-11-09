-- Watchdog: daily health checks, deduped alerts, dead letters.
-- Written by the cron job with the service role key; users may only read their own rows.

create table if not exists public.watchdog_checks (
  id            uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  status        text not null check (status in ('ok', 'warn', 'broken')),
  reason_code   text,
  detail        jsonb not null default '{}'::jsonb,
  checked_at    timestamptz not null default timezone('utc', now())
);

create index if not exists watchdog_checks_automation_idx
  on public.watchdog_checks (automation_id, checked_at desc);

-- One open alert per (automation, reason). resolved_at set when the check goes back to ok.
create table if not exists public.watchdog_alerts (
  id            uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  reason_code   text not null,
  first_sent_at timestamptz not null default timezone('utc', now()),
  last_sent_at  timestamptz not null default timezone('utc', now()),
  send_count    integer not null default 1,
  channel       text not null default 'dashboard',
  resolved_at   timestamptz
);

create unique index if not exists watchdog_alerts_open_uniq
  on public.watchdog_alerts (automation_id, reason_code)
  where resolved_at is null;

create table if not exists public.dead_letters (
  id            uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  run_id        uuid references public.automation_runs (id) on delete set null,
  payload       jsonb not null default '{}'::jsonb,
  error_message text,
  created_at    timestamptz not null default timezone('utc', now()),
  retried_at    timestamptz
);

alter table public.watchdog_checks enable row level security;
alter table public.watchdog_alerts enable row level security;
alter table public.dead_letters enable row level security;

drop policy if exists "watchdog_checks_select_own" on public.watchdog_checks;
create policy "watchdog_checks_select_own" on public.watchdog_checks
  for select using (auth.uid() = user_id);

drop policy if exists "watchdog_alerts_select_own" on public.watchdog_alerts;
create policy "watchdog_alerts_select_own" on public.watchdog_alerts
  for select using (auth.uid() = user_id);

drop policy if exists "dead_letters_select_own" on public.dead_letters;
create policy "dead_letters_select_own" on public.dead_letters
  for select using (auth.uid() = user_id);
