-- Migration: BCV official rate table
-- Edge function supabase/functions/bcv/index.ts upserts into this table (service role).
-- Reads go through the service role key, so RLS blocks anon/public writes.
-- Applied via: supabase migration up (already applied to prod manually).

create table if not exists public.bcv_rates (
  date date primary key,
  usd_ves numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.bcv_rates enable row level security;
