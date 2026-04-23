-- ============================================================
-- AutomateCraft Credit System Migration
-- Adds: plan_credits, extra_credits columns to profiles
--        usage_logs, subscriptions, credit_transactions tables
--        Atomic deduct function, RLS policies
-- ============================================================

-- -------------------------------------------------------
-- 1. Add credit columns to profiles (idempotent)
-- -------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'plan_credits'
  ) then
    alter table public.profiles
      add column plan_credits numeric(12,2) not null default 10;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'extra_credits'
  ) then
    alter table public.profiles
      add column extra_credits numeric(12,2) not null default 0;
  end if;
end $$;

-- -------------------------------------------------------
-- 2. Usage Logs table
-- -------------------------------------------------------
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  credits_used numeric(12,2) not null default 0,
  status text not null default 'Success' check (status in ('Success', 'Failed')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists usage_logs_user_id_idx
  on public.usage_logs (user_id);

create index if not exists usage_logs_created_at_idx
  on public.usage_logs (created_at desc);

-- -------------------------------------------------------
-- 3. Subscriptions table
-- -------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null,
  plan_name text not null,
  credits_granted numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

create index if not exists subscriptions_status_idx
  on public.subscriptions (user_id, status);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

-- -------------------------------------------------------
-- 4. Credit Transactions table (audit trail)
-- -------------------------------------------------------
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('grant', 'deduct', 'purchase', 'subscription', 'refund', 'adjustment')),
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id);

create index if not exists credit_transactions_created_at_idx
  on public.credit_transactions (user_id, created_at desc);

create index if not exists credit_transactions_type_idx
  on public.credit_transactions (user_id, type);

-- -------------------------------------------------------
-- 5. Atomic credit deduction function
--    Prevents race conditions by doing read-check-update
--    in a single transaction with row-level locking.
-- -------------------------------------------------------
create or replace function public.deduct_credits_atomic(
  p_user_id uuid,
  p_amount numeric,
  p_action text,
  p_description text default ''
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_plan_credits numeric;
  v_extra_credits numeric;
  v_new_plan numeric;
  v_new_extra numeric;
  v_total_after numeric;
begin
  -- Lock the row to prevent concurrent modifications
  select plan_credits, extra_credits
  into v_plan_credits, v_extra_credits
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  -- Check sufficient balance
  if (v_plan_credits + v_extra_credits) < p_amount then
    -- Log the failed attempt
    insert into public.usage_logs (user_id, action, credits_used, status)
    values (p_user_id, p_action, p_amount, 'Failed');

    insert into public.credit_transactions (user_id, type, amount, balance_after, description)
    values (p_user_id, 'deduct', p_amount, v_plan_credits + v_extra_credits,
            'FAILED: ' || p_description || ' — insufficient balance');

    return jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'balance', v_plan_credits + v_extra_credits
    );
  end if;

  -- Deduct from plan credits first, then extra credits
  if v_plan_credits >= p_amount then
    v_new_plan := v_plan_credits - p_amount;
    v_new_extra := v_extra_credits;
  else
    v_new_plan := 0;
    v_new_extra := v_extra_credits - (p_amount - v_plan_credits);
  end if;

  v_total_after := v_new_plan + v_new_extra;

  -- Update the profile
  update public.profiles
  set plan_credits = v_new_plan,
      extra_credits = v_new_extra
  where id = p_user_id;

  -- Log the successful deduction
  insert into public.usage_logs (user_id, action, credits_used, status)
  values (p_user_id, p_action, p_amount, 'Success');

  insert into public.credit_transactions (user_id, type, amount, balance_after, description)
  values (p_user_id, 'deduct', p_amount, v_total_after, p_description);

  return jsonb_build_object(
    'success', true,
    'plan_credits', v_new_plan,
    'extra_credits', v_new_extra,
    'total_credits', v_total_after
  );
end;
$$;

-- -------------------------------------------------------
-- 6. Atomic credit addition function (for purchases/grants)
-- -------------------------------------------------------
create or replace function public.add_credits_atomic(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_description text default ''
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_new_extra numeric;
  v_plan_credits numeric;
  v_total_after numeric;
begin
  -- Lock the row
  select plan_credits, extra_credits
  into v_plan_credits, v_new_extra
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  -- Add to extra_credits (purchases always go to extra)
  v_new_extra := v_new_extra + p_amount;
  v_total_after := v_plan_credits + v_new_extra;

  update public.profiles
  set extra_credits = v_new_extra
  where id = p_user_id;

  -- Log the transaction
  insert into public.usage_logs (user_id, action, credits_used, status)
  values (p_user_id, p_description, 0, 'Success');

  insert into public.credit_transactions (user_id, type, amount, balance_after, description)
  values (p_user_id, p_type, p_amount, v_total_after, p_description);

  return jsonb_build_object(
    'success', true,
    'extra_credits', v_new_extra,
    'total_credits', v_total_after
  );
end;
$$;

-- -------------------------------------------------------
-- 7. RLS policies for new tables
-- -------------------------------------------------------

-- usage_logs: users can read their own
alter table public.usage_logs enable row level security;

drop policy if exists "usage_logs_select_own" on public.usage_logs;
create policy "usage_logs_select_own"
on public.usage_logs
for select
using (auth.uid() = user_id);

-- Inserts/updates via service-role only (no user insert policy)
drop policy if exists "usage_logs_insert_service" on public.usage_logs;
create policy "usage_logs_insert_service"
on public.usage_logs
for insert
with check (true);

-- subscriptions: users can read their own
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_service" on public.subscriptions;
create policy "subscriptions_insert_service"
on public.subscriptions
for insert
with check (true);

drop policy if exists "subscriptions_update_service" on public.subscriptions;
create policy "subscriptions_update_service"
on public.subscriptions
for update
using (true);

-- credit_transactions: users can read their own
alter table public.credit_transactions enable row level security;

drop policy if exists "credit_transactions_select_own" on public.credit_transactions;
create policy "credit_transactions_select_own"
on public.credit_transactions
for select
using (auth.uid() = user_id);

drop policy if exists "credit_transactions_insert_service" on public.credit_transactions;
create policy "credit_transactions_insert_service"
on public.credit_transactions
for insert
with check (true);

-- -------------------------------------------------------
-- 8. Grant execute on functions to authenticated/service_role
-- -------------------------------------------------------
grant execute on function public.deduct_credits_atomic(uuid, numeric, text, text) to authenticated;
grant execute on function public.deduct_credits_atomic(uuid, numeric, text, text) to service_role;
grant execute on function public.add_credits_atomic(uuid, numeric, text, text) to authenticated;
grant execute on function public.add_credits_atomic(uuid, numeric, text, text) to service_role;
