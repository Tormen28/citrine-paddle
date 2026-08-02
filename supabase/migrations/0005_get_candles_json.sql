-- Migration: get_candles returns json instead of TABLE.
-- Fixes PostgREST db-max-rows=1000 truncating short timeframes (5m/10m/15m/30m)
-- to 1000 rows. Returning a single json value bypasses the row limit entirely.

drop function if exists public.get_candles(text, integer);

create or replace function public.get_candles(p_timeframe text, p_limit integer default 8000)
returns json
language sql
as $function$
  with params as (
    select (case p_timeframe
      when '5m' then interval '5 minutes'
      when '10m' then interval '10 minutes'
      when '15m' then interval '15 minutes'
      when '30m' then interval '30 minutes'
      when '1h' then interval '1 hour'
      when '4h' then interval '4 hours'
      when '8h' then interval '8 hours'
      when '24h' then interval '1 day'
      else interval '1 hour'
    end) as iv
  ),
  recent as (
    select timestamp, buyprice, volume
    from marketsnapshot
    order by timestamp desc
    limit p_limit
  ),
  agg as (
    select
      to_timestamp(floor(extract(epoch from r.timestamp) / extract(epoch from p.iv)) * extract(epoch from p.iv)) as bucket,
      (array_agg(r.buyprice order by r.timestamp))[1] as open,
      max(r.buyprice) as high,
      min(r.buyprice) as low,
      (array_agg(r.buyprice order by r.timestamp))[array_length(array_agg(r.buyprice order by r.timestamp), 1)] as close,
      sum(coalesce(r.volume, 0)) as volume
    from recent r, params p
    group by bucket
  )
  select coalesce(json_agg(row_to_json(a) order by a.bucket asc), '[]'::json)
  from agg a;
$function$;

revoke execute on function public.get_candles(text, integer) from public;
grant execute on function public.get_candles(text, integer) to anon;
