# Reporte semanal por correo

Envía un resumen semanal (caja, ranking de técnicos/clientes, tipo de trabajo
más frecuente, tiempo promedio de reparación) a los correos configurados.
100% gratis: usa Gmail SMTP para enviar y el cron nativo de Supabase para
programar el envío — sin servicios de terceros de pago.

## 1. Crear la contraseña de aplicación de Gmail

1. En la cuenta de Gmail que enviará los correos, activa la verificación en
   2 pasos (si no la tienes ya): https://myaccount.google.com/security
2. Ve a https://myaccount.google.com/apppasswords, crea una nueva
   "Contraseña de aplicación" (nombre: "Mega Unlock") y copia el código de
   16 letras que te da. Esa contraseña es distinta a la de tu cuenta.

## 2. Aplicar la migración de base de datos

En el SQL Editor de tu proyecto de Supabase, ejecuta el contenido de
`supabase/migrations/0001_add_estado_timestamps.sql` (agrega dos columnas
para poder calcular el tiempo de reparación).

## 3. Instalar la CLI de Supabase y vincular el proyecto

```bash
npx supabase login
npx supabase link --project-ref smjdwyddlsraqscizrzl
```

## 4. Configurar los secretos de la función

```bash
npx supabase secrets set GMAIL_USER=tu-correo@gmail.com
npx supabase secrets set GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
npx supabase secrets set REPORT_RECIPIENTS=belloxavier22@gmail.com,moratinosandrea@gmail.com
```

(`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los agrega Supabase solo, no
hace falta configurarlos.)

## 5. Desplegar la función

```bash
npx supabase functions deploy weekly-report --no-verify-jwt
```

`--no-verify-jwt` es necesario porque el cron llama a la función sin loguearse
como un usuario. Como la función no recibe datos del que la llama (solo lee
la base de datos y envía el correo), el único riesgo de dejarla pública es que
alguien la dispare manualmente y llegue un correo extra — no expone datos.

## 6. Programar el envío semanal

Opción más simple: en el Dashboard de Supabase ve a **Integrations → Cron
Jobs → Create a new cron job**, elige "Supabase Edge Function", selecciona
`weekly-report` y define el horario, por ejemplo `0 9 * * 1` (todos los
lunes 9:00 UTC).

Si tu proyecto no tiene esa sección en el Dashboard, la alternativa es correr
esto una vez en el SQL Editor (requiere las extensiones `pg_cron` y `pg_net`,
activables en Database → Extensions):

```sql
select cron.schedule(
  'weekly-report-mega-unlock',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := 'https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/weekly-report'
  );
  $$
);
```

## Probarlo manualmente

```bash
curl -X POST https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/weekly-report
```

Si todo está bien configurado, llega el correo al toque y la respuesta es
`{"ok":true,...}`.
