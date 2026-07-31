-- error_logs and page_views have no retention policy and grow forever.
-- This schedules a daily job that deletes rows older than 90 days.
-- cron.schedule() upserts by job name, so re-running this migration is safe.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'cleanup_error_logs',
  '0 3 * * *',
  $$ delete from public.error_logs where created_at < now() - interval '90 days'; $$
);

select cron.schedule(
  'cleanup_page_views',
  '0 3 * * *',
  $$ delete from public.page_views where visited_at < now() - interval '90 days'; $$
);
