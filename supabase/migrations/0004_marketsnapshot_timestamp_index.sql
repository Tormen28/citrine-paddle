-- Migration: index on marketsnapshot.timestamp (DESC) for keyset pagination
-- and candle aggregation. Applied via: supabase migration up.

create index if not exists idx_marketsnapshot_timestamp
  on public.marketsnapshot ("timestamp" desc);
