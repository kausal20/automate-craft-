-- Workflow execution logging tables
-- Tracks every run-workflow API execution and each step within it.

create table if not exists workflow_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       text,
  workflow_id   text,
  status        text not null default 'pending'
                check (status in ('pending', 'running', 'success', 'failed')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create table if not exists step_logs (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references workflow_runs(id) on delete cascade,
  step_name  text not null,
  status     text not null check (status in ('success', 'failed')),
  output     jsonb,
  error      text,
  created_at timestamptz not null default now()
);

-- Index for fast lookups by run
create index if not exists idx_step_logs_run_id on step_logs(run_id);

-- Index for listing runs by user
create index if not exists idx_workflow_runs_user_id on workflow_runs(user_id);
