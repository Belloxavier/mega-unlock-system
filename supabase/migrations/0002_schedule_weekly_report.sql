-- Programa el envío automático del reporte semanal todos los lunes a las
-- 09:00 UTC (06:00 hora de Chile en horario de verano / 05:00 en invierno).
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'weekly-report-mega-unlock',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := 'https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/weekly-report',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
