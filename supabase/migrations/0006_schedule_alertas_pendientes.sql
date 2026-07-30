-- Revisa todos los días a las 15:00 UTC (~11-12hrs Chile) si hay trabajos
-- completados sin cobrar, pendientes sin empezar, o garantías sin resolver
-- de más de 48 horas. Solo envía correo si encuentra algo.
select cron.schedule(
  'alertas-pendientes-mega-unlock',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/alertas-pendientes',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
