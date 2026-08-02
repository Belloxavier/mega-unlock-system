-- Protege weekly-report y alertas-pendientes con un secreto compartido: hoy
-- están desplegadas con --no-verify-jwt y el cron las llama sin ningún
-- header de autorización, así que cualquiera que encuentre la URL (estaba
-- documentada como ejemplo curl en los README) puede dispararlas
-- manualmente. Ahora el cron manda un header X-Cron-Secret que cada
-- función exige y compara contra el secreto CRON_SHARED_SECRET; sin ese
-- header (o si no coincide) la función responde 401 y no hace nada.
--
-- El valor del secreto vive en Supabase Vault (extensión supabase_vault,
-- ya habilitada en este proyecto) bajo el nombre 'cron_shared_secret' —
-- esta migración solo referencia ese NOMBRE, nunca el valor, así que es
-- seguro tenerla en git. (Se intentó primero con
-- `alter database ... set app.settings.cron_secret`, pero Supabase
-- hospedado no da permiso para eso — por eso Vault.)
--
-- IMPORTANTE — pasos manuales antes de que esto funcione de verdad (son
-- secretos, no se pueden ni deben guardar en una migración ni en git):
--   1. Elegir un secreto largo y aleatorio, ej: openssl rand -hex 32
--   2. Guardarlo en Vault con ESE nombre exacto:
--        select vault.create_secret('EL_SECRETO', 'cron_shared_secret', 'Secreto compartido para los cron jobs');
--   3. En Supabase, con el MISMO valor:
--        npx supabase secrets set CRON_SHARED_SECRET=EL_MISMO_SECRETO
--   4. Redesplegar ambas funciones:
--        npx supabase functions deploy weekly-report --no-verify-jwt
--        npx supabase functions deploy alertas-pendientes --no-verify-jwt
-- Si el paso 2 no se hizo, la subconsulta de abajo no devuelve fila y el
-- cron manda el header vacío — la función seguirá respondiendo 401 hasta
-- que los pasos estén hechos con el mismo secreto.

do $$
begin
  perform cron.unschedule('weekly-report-mega-unlock');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('alertas-pendientes-mega-unlock');
exception when others then
  null;
end $$;

select cron.schedule(
  'weekly-report-mega-unlock',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := 'https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_shared_secret')
    )
  );
  $$
);

select cron.schedule(
  'alertas-pendientes-mega-unlock',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/alertas-pendientes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_shared_secret')
    )
  );
  $$
);
