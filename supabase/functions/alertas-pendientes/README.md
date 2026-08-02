# Resumen diario de pendientes (22:00 Chile)

Todas las noches a las 22:00 hora de Chile revisa si hay trabajos
Completados sin cobrar/retirar, Pendientes sin empezar, o garantías sin
resolver — sea cual sea su antigüedad — y avisa por correo con el nombre
del cliente y el folio. Si no hay nada pendiente, no envía correo.

El cron de Supabase corre cada hora en punto (UTC), pero la función
revisa la hora local de Chile y solo envía cuando son las 22:00 —así no se
desfasa con el cambio de horario de verano/invierno, que un cron fijo en
UTC no puede seguir por sí solo.

Antes se enviaba solo si algo llevaba 48h+ pendiente (secreto
`HORAS_LIMITE_ALERTA`); se eliminó ese umbral porque el correo no estaba
llegando y un envío fijo diario es más fácil de confirmar. El secreto
`HORAS_LIMITE_ALERTA` ya no se usa — puedes borrarlo de los secretos del
proyecto si quieres, no pasa nada si lo dejas.

Usa los mismos secretos que `weekly-report` (`GMAIL_USER`,
`GMAIL_APP_PASSWORD`, `REPORT_RECIPIENTS`, `CRON_SHARED_SECRET`) — si ya
configuraste esa función, solo falta `CRON_SHARED_SECRET` si aún no lo
pusiste.

Esta función está desplegada con `--no-verify-jwt` (el cron la llama sin
loguearse), así que la única barrera real contra invocaciones externas es
`CRON_SHARED_SECRET`: exige el header `X-Cron-Secret` y sin él (o si no
coincide) responde 401 sin hacer nada. Antes esta URL estaba documentada
como ejemplo `curl` invocable por cualquiera — ya no es así.

## Desplegar

```bash
npx supabase secrets set CRON_SHARED_SECRET=el-mismo-secreto-que-en-weekly-report
npx supabase db push
npx supabase functions deploy alertas-pendientes --no-verify-jwt
```

`db push` aplica las migraciones pendientes (recron a cada hora + el header
`X-Cron-Secret`, ver `0020_proteger_cron_edge_functions.sql` — esa misma
migración explica cómo guardar el secreto en Supabase Vault con el nombre
`cron_shared_secret` y el MISMO valor). La función se ejecuta cada hora
pero solo envía correo cuando son las 22:00 en Chile.

## Probarlo manualmente

```bash
curl -X POST https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/alertas-pendientes \
  -H "X-Cron-Secret: el-mismo-secreto-que-en-weekly-report"
```

Sin el header (o con el valor equivocado) responde `401 {"error":"No autorizado"}`.
Si el secreto es correcto, responde `{"ok":true,"enviado":false,"motivo":"No es la hora programada..."}`
si no son las 22h en Chile, `{"ok":true,"enviado":false,"motivo":"Sin pendientes"}`
si es la hora pero no hay nada pendiente, o
`{"ok":true,"enviado":true,"total":N,...}` si mandó el correo.
