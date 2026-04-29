create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.contact_requests enable row level security;

drop policy if exists "contact_requests_insert_public" on public.contact_requests;
create policy "contact_requests_insert_public"
on public.contact_requests
for insert
to anon, authenticated
with check (true);
