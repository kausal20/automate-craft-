-- Credit ledger fix.
--
-- 1. deduct_credits_atomic / add_credits_atomic take p_reference_id and write
--    the credit_transactions row WITH that reference in the same transaction.
--    The RPC's row is the only ledger row per movement (no post-hoc tagging,
--    no duplicate inserts from application code).
-- 2. A partial unique index on (reference_id, type) makes a duplicate deduct or
--    a duplicate refund for the same reference impossible. The functions report
--    a duplicate as success with "duplicate": true (idempotent), never an error.
-- 3. deduct records which purse paid (plan_part, extra_part) in metadata so a
--    refund can restore exactly that split. add_credits_atomic takes p_to_plan:
--    the part that goes back to plan_credits; the rest goes to extra_credits.
-- 4. A failed (insufficient) deduct writes NO ledger row (it moved nothing) —
--    only a Failed usage_logs entry. Otherwise a failed attempt would carry the
--    reference and block the real charge later.
-- The allowed transaction types are unchanged. Run charges stay type 'deduct'.

-- Old signatures: drop so the new ones are the only overloads.
drop function if exists public.deduct_credits_atomic(uuid, numeric, text, text);
drop function if exists public.add_credits_atomic(uuid, numeric, text, text);

create unique index if not exists credit_transactions_reference_type_uniq
  on public.credit_transactions (reference_id, type)
  where reference_id is not null;

create or replace function public.deduct_credits_atomic(
  p_user_id uuid,
  p_amount numeric,
  p_action text,
  p_description text default '',
  p_reference_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan numeric;
  v_extra numeric;
  v_plan_part numeric;
  v_extra_part numeric;
  v_total numeric;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Amount must be positive');
  end if;

  if p_reference_id is not null and exists (
    select 1 from public.credit_transactions where reference_id = p_reference_id and type = 'deduct'
  ) then
    return jsonb_build_object('success', true, 'duplicate', true);
  end if;

  select plan_credits, extra_credits into v_plan, v_extra
  from public.profiles where id = p_user_id for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  if (v_plan + v_extra) < p_amount then
    insert into public.usage_logs (user_id, action, credits_used, status)
    values (p_user_id, p_action, p_amount, 'Failed');
    return jsonb_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_plan + v_extra);
  end if;

  -- Plan purse first, then extra purse.
  v_plan_part := least(v_plan, p_amount);
  v_extra_part := p_amount - v_plan_part;
  v_total := v_plan + v_extra - p_amount;

  begin
    update public.profiles
       set plan_credits = v_plan - v_plan_part,
           extra_credits = v_extra - v_extra_part
     where id = p_user_id;

    insert into public.credit_transactions (user_id, type, amount, balance_after, description, reference_id, metadata)
    values (
      p_user_id, 'deduct', p_amount, v_total, coalesce(p_description, ''), p_reference_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('plan_part', v_plan_part, 'extra_part', v_extra_part)
    );

    insert into public.usage_logs (user_id, action, credits_used, status)
    values (p_user_id, p_action, p_amount, 'Success');
  exception when unique_violation then
    -- A concurrent call with the same reference won the race; this block's
    -- profile update is rolled back with it. Same outcome: charged once.
    return jsonb_build_object('success', true, 'duplicate', true);
  end;

  return jsonb_build_object(
    'success', true, 'duplicate', false,
    'plan_part', v_plan_part, 'extra_part', v_extra_part, 'total_credits', v_total
  );
end;
$$;

create or replace function public.add_credits_atomic(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_description text default '',
  p_reference_id text default null,
  p_to_plan numeric default 0,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan numeric;
  v_extra numeric;
  v_total numeric;
  v_to_plan numeric := coalesce(p_to_plan, 0);
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Amount must be positive');
  end if;
  if v_to_plan < 0 or v_to_plan > p_amount then
    return jsonb_build_object('success', false, 'error', 'Invalid purse split');
  end if;

  if p_reference_id is not null and exists (
    select 1 from public.credit_transactions where reference_id = p_reference_id and type = p_type
  ) then
    return jsonb_build_object('success', true, 'duplicate', true);
  end if;

  select plan_credits, extra_credits into v_plan, v_extra
  from public.profiles where id = p_user_id for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  v_total := v_plan + v_extra + p_amount;

  begin
    update public.profiles
       set plan_credits = v_plan + v_to_plan,
           extra_credits = v_extra + (p_amount - v_to_plan)
     where id = p_user_id;

    insert into public.credit_transactions (user_id, type, amount, balance_after, description, reference_id, metadata)
    values (
      p_user_id, p_type, p_amount, v_total, coalesce(p_description, ''), p_reference_id,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('plan_part', v_to_plan, 'extra_part', p_amount - v_to_plan)
    );

    insert into public.usage_logs (user_id, action, credits_used, status)
    values (p_user_id, coalesce(p_description, p_type), 0, 'Success');
  exception when unique_violation then
    return jsonb_build_object('success', true, 'duplicate', true);
  end;

  return jsonb_build_object(
    'success', true, 'duplicate', false,
    'plan_credits', v_plan + v_to_plan, 'extra_credits', v_extra + (p_amount - v_to_plan), 'total_credits', v_total
  );
end;
$$;

-- Server only. Signed-in users must never move credits themselves.
revoke execute on function public.deduct_credits_atomic(uuid, numeric, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.add_credits_atomic(uuid, numeric, text, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.deduct_credits_atomic(uuid, numeric, text, text, text, jsonb) to service_role;
grant execute on function public.add_credits_atomic(uuid, numeric, text, text, text, numeric, jsonb) to service_role;
