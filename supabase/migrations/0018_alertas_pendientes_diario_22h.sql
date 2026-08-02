-- Cambia alertas-pendientes de "una vez al día a las 15:00 UTC, solo si
-- algo lleva 48h+ pendiente" a "cada hora, pero la función solo envía si
-- son las 22:00 hora de Chile". La función revisa la hora local de Chile
-- internamente (ver supabase/functions/alertas-pendientes/index.ts) para
-- no desfasarse con el cambio de horario de verano/invierno, algo que un
-- cron fijo en UTC no puede resolver por sí solo. El resumen ahora es del
-- estado ACTUAL (sin filtro de 48h), no de lo atrasado.
do $$
begin
  perform cron.unschedule('alertas-pendientes-mega-unlock');
exception when others then
  null;
end $$;

select cron.schedule(
  'alertas-pendientes-mega-unlock',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/alertas-pendientes',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
