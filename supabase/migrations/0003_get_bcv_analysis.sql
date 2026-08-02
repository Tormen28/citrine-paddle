-- Migration: get_bcv_analysis RPC - daily BCV rate vs P2P average, last N days.
-- Powers /api/bcv?history=true for the BCV vs P2P table.
-- Applied via: supabase migration up (already applied to prod manually).

create or replace function public.get_bcv_analysis(p_days integer default 90)
returns table(
  date date,
  usd_ves numeric,
  p2p_avg numeric
)
language sql
as $function$
  select
    b.date,
    b.usd_ves,
    round(avg(m.buyprice)::numeric, 2) as p2p_avg
  from bcv_rates b
  left join marketsnapshot m on m.timestamp::date = b.date
  where b.date >= (current_date - p_days)
  group by b.date, b.usd_ves
  order by b.date desc;
$function$;

revoke execute on function public.get_bcv_analysis(integer) from public;
grant execute on function public.get_bcv_analysis(integer) to anon;
