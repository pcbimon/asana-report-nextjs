/**
 * SQL script to set up the daily cronjob for Asana data synchronization
 * This should be run in your Supabase SQL editor after deploying the Edge Function
 */

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a daily cronjob to sync Asana data at 2 AM every day
-- This assumes your Supabase project timezone is set appropriately
SELECT cron.schedule(
  'daily-asana-sync',              -- job name
  '0 2 * * *',                     -- cron expression: daily at 2 AM
  $$
    SELECT
      net.http_post(
        url := 'https://your-project-ref.supabase.co/functions/v1/asana-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object()::text
      );
  $$
);

-- View all scheduled jobs (for verification)
-- SELECT * FROM cron.job;

-- To remove the job later (if needed):
-- SELECT cron.unschedule('daily-asana-sync');