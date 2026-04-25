-- Add reference_id column to credit_transactions for linking to workflow runs.
-- Also add 'usage' and 'bonus' to the set of recognized transaction types.
-- This is backward-compatible: existing rows keep their current type values,
-- and reference_id is nullable so old rows are unaffected.

alter table if exists credit_transactions
  add column if not exists reference_id text;

-- Index for looking up transactions by workflow run
create index if not exists idx_credit_transactions_reference_id
  on credit_transactions(reference_id)
  where reference_id is not null;
