# Reporte semanal por correo

## Recuperación y diagnóstico

Las consultas rechazadas con `PGRST303: JWT issued at future` se repiten
hasta tres veces (esperas de 1, 3 y 7 segundos). Si alguna de las tres
consultas falla definitivamente, no se envía un reporte parcial. El envío
SMTP nunca se reintenta automáticamente para evitar duplicados.

Para comprobar configuración y consultas sin enviar correo, invoca la misma
URL con `?diagnostico=1` y el header `X-Cron-Secret` habitual. Una respuesta
`ok: true, diagnostico: true, enviado: false` confirma acceso a los datos y
presencia de configuración, pero no prueba la contraseña SMTP ni entrega a
la bandeja del destinatario. El diagnóstico no cambia el cron.

Los logs de la función registran `correo_consulta_reintento`, `correo_fallido`
(con etapa de configuración, consulta o SMTP) y `correo_enviado`. Este último
significa que SMTP aceptó el envío, no que llegó a la bandeja de entrada.
El estado `succeeded` de pg_cron solo confirma que se encoló la petición HTTP.
Si el fallo persiste tras los reintentos, revisar los logs y el servicio de
datos de Supabase; no desactivar la validación JWT ni cambiar claves a ciegas.

Pruebas locales (Node 24 y dependencias del proyecto):
`node --test supabase/functions/_shared/consultasCorreo.test.mjs`.

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
npx supabase secrets set CRON_SHARED_SECRET=el-mismo-secreto-del-paso-6
```

(`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los agrega Supabase solo, no
hace falta configurarlos.)

`CRON_SHARED_SECRET` es la única barrera real contra invocaciones externas
(la función está desplegada con `--no-verify-jwt`, ver paso 5) — sin este
secreto configurado, la función responde 401 a cualquier llamada, incluida
la del cron. Debe ser EXACTAMENTE el mismo valor que se guarda en Vault en
el paso 6.

## 5. Desplegar la función

```bash
npx supabase functions deploy weekly-report --no-verify-jwt
```

`--no-verify-jwt` es necesario porque el cron llama a la función sin loguearse
como un usuario de Supabase Auth. Eso por sí solo dejaría la función invocable
por cualquiera que encuentre la URL — por eso además exige el header
`X-Cron-Secret` (ver paso 4 y paso 6): sin él, o si no coincide, responde 401
y no hace nada.

## 6. Programar el envío semanal y el secreto compartido

Este proyecto ya trae la migración `0020_proteger_cron_edge_functions.sql`
que programa el cron con el header `X-Cron-Secret`, leyendo el valor desde
**Supabase Vault** (no desde un ajuste de base de datos — se intentó con
`alter database ... set app.settings.cron_secret` pero Supabase hospedado
no da permiso para eso). Antes de que funcione de verdad hay que guardar
el mismo secreto en dos lugares (son secretos, no van en ningún archivo
del repo):

```sql
-- En el SQL Editor de Supabase (o npx supabase db query), con el MISMO
-- valor que en el paso 4. El nombre 'cron_shared_secret' es fijo, lo usa
-- la migración 0020 para encontrarlo:
select vault.create_secret('el-mismo-secreto-del-paso-4', 'cron_shared_secret', 'Secreto compartido para los cron jobs');
```

```bash
npx supabase secrets set CRON_SHARED_SECRET=el-mismo-secreto-del-paso-4
```

Luego aplica la migración con `npx supabase db push`. Si tu proyecto no
tiene `pg_cron`/`pg_net`/`supabase_vault` activados, actívalos en
Database → Extensions antes de correr la migración.

## Probarlo manualmente

```bash
curl -X POST https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/weekly-report \
  -H "X-Cron-Secret: el-mismo-secreto-del-paso-4"
```

Sin el header (o con el valor equivocado) responde `401 {"error":"No autorizado"}`.
Si todo está bien configurado, llega el correo al toque y la respuesta es
`{"ok":true,...}`.
