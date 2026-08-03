-- Setup the BCV rate fetch cron job.
-- Runs every 30 min (BCV publishes the business-day rate in the afternoon,
-- so a 1 AM daily run would always leave the stored rate one day behind).
-- Edge function supabase/functions/bcv/index.ts has a 30 min in-memory cache,
-- so frequent triggers do not hammer the upstream BCV API.
SELECT cron.schedule(
  'bcv-daily-fetch',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/bcv',
    headers := '{"Authorization": "Bearer <YOUR_SUPABASE_SERVICE_ROLE_KEY>", "Content-Type": "application/json"}',
    body := '{}'
  );
  $$
);
