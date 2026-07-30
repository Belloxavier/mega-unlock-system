# Alerta diaria de pendientes (+48h)

Revisa cada día si hay trabajos Completados sin cobrar/retirar, Pendientes
sin empezar, o garantías sin resolver de más de 48 horas, y avisa por
correo con el nombre del cliente y el folio. Si no hay nada pendiente, no
envía correo.

Usa los mismos secretos que `weekly-report` (`GMAIL_USER`,
`GMAIL_APP_PASSWORD`, `REPORT_RECIPIENTS`) — si ya configuraste esa función,
no hace falta configurar nada nuevo.

## Desplegar

```bash
npx supabase db push
npx supabase functions deploy alertas-pendientes --no-verify-jwt
```

`db push` aplica las migraciones pendientes (columna `resuelta` en
garantías y el cron diario). El cron corre todos los días a las 15:00 UTC.

## Probarlo manualmente

```bash
curl -X POST https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/alertas-pendientes
```

Responde `{"ok":true,"enviado":false,...}` si no hay nada pendiente todavía,
o `{"ok":true,"enviado":true,"total":N,...}` si mandó el correo.
