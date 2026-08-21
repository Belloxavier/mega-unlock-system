# Registro de progreso

---
## [2026-08-21 00:00] Aviso colapsable en Inicio, fix botón eliminar en iPhone, y push de todo lo acumulado

### Instrucción recibida
1. Hacer colapsable/acordeón el banner "clientes con equipos listos sin avisar" en Inicio, recordando el estado abierto/cerrado al navegar entre pestañas.
2. Diagnosticar y corregir que el ícono de eliminar (🗑️) en Historial no aparece/no funciona en iPhone + Chrome, y auditar el resto de la app en busca del mismo problema ("solo funciona con mouse hover").
3. Tras probar localmente: aplicar la migración pendiente `0023` en Supabase y subir (commit + push) todo el trabajo acumulado de esta sesión y sesiones previas no subidas.

### Comandos ejecutados (todos, en orden)
- `Grep "opacity-0|group-hover|invisible|hover:visible|hover:block|hover:flex"` en `src/` → 1 match, `src/components/dashboard/ImeiTab.tsx` (solo cambio de color en hover, no oculta el botón).
- `Read src/components/dashboard/components/HistorialServicios.tsx` (completo) → confirmó que el layout móvil (`md:hidden`) nunca tuvo botón de eliminar; solo el layout de escritorio (`hidden md:block`) lo tenía.
- `Grep "opacity-0|group-hover|invisible|hover:visible|hover:block|hover:flex" src/components/dashboard/ImeiTab.tsx -C 4` → confirmó que es solo un tinte de color, no un problema real.
- `Grep "onDelete" src/components/dashboard/Dashboard.tsx -C 6` → confirmó wiring de `handleDeleteServicio`.
- `Grep "handleDeleteServicio" src/components/dashboard/Dashboard.tsx -C 10` → confirmó que ya pasa por `ConfirmSheet` (peligro:true, confirmLabel:'Eliminar').
- `Grep "vista === 'inicio'|AlertasFiados|AvisosPendientes" src/components/dashboard/Dashboard.tsx` → ubicó el render actual del banner.
- `Grep "md:hidden|hidden md:block|hidden md:table|hidden md:grid"` en `src/` → confirmó que `HistorialServicios.tsx` es el ÚNICO archivo con layout móvil/escritorio separado (por lo tanto el bug no puede repetirse en otro lado con esa forma).
- `Grep "className=\"[^\"]*\\bp-1\\b[^\"]*\"|..."` en `src/` → 3 archivos (`FinanzasTab.tsx`, `EstadisticasTab.tsx`, `GarantiasTab.tsx`); revisados con `Grep -B3 -A1`, confirmado que `p-1` es padding de contenedor, no de botones individuales (no son tap targets chicos reales).
- Edit en `src/components/dashboard/components/AvisosPendientes.tsx` → agregó props `abierto`/`onToggle`, header tocable con resumen + flecha ▲/▼, lista solo visible si `abierto`.
- Edit en `src/components/dashboard/Dashboard.tsx` → agregó `const [avisosAbierto, setAvisosAbierto] = useState(false)` y pasó `abierto`/`onToggle` a `<AvisosPendientes />`.
- Edit en `src/components/dashboard/components/HistorialServicios.tsx` → agregó botón "🗑️ Eliminar" a la fila de acciones de las tarjetas móviles, llamando a `props.onDelete(s.id)`.
- `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- `npm run build` (`tsc -b && vite build`) → build exitoso (405ms), sin errores.
- `npm run lint` (`oxlint`) → sin salida, sin errores.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:5174` → `200` (dev server activo).
- (Usuario dio visto bueno: "sube todo, genial")
- `git status` + `git diff --stat` + `git log --oneline -5` → revisión de todo lo pendiente de subir.
- `Glob supabase/migrations/*.sql` → confirmó que `0023_avisado_at_servicios.sql` no estaba aplicado.
- `Read AGENTS.md` (completo) → verificado antes de incluirlo en el commit; es una copia de la filosofía de CLAUDE.md, sin contenido sensible.
- `git diff -- src/lib/normalizarTexto.ts` → revisado, solo un comentario actualizado (referencias a "dificultad, carga del taller" quitadas del docstring tras eliminar esas features).
- `Read supabase/migrations/0023_avisado_at_servicios.sql` → obtuvo el SQL exacto a aplicar.
- `Bash: cd ... && (command -v supabase && supabase --version)` + `cat supabase/config.toml` + `ls supabase` → confirmó que no hay CLI de Supabase instalado ni config.toml.
- `ToolSearch "supabase"` → sin herramientas MCP de Supabase disponibles.
- `Bash: ls -la .env*` + `grep -riE "DATABASE_URL|POSTGRES|..." .env*` + `command -v psql` → confirmó que no hay credenciales de DB ni psql disponibles en el entorno.
- `Bash: ls PROGRESS_LOG.md` → confirmó que el archivo no existía todavía.
- `grep -n '"scripts"' -A20 package.json` → confirmó que no hay script de migración en package.json.
- `AskUserQuestion` → se preguntó al usuario cómo aplicar la migración sin credenciales disponibles; el usuario respondió pegando directamente un access token de la Management API de Supabase (`sbp_...`).
- `curl -s -X POST https://api.supabase.com/v1/projects/smjdwyddlsraqscizrzl/database/query -H "Authorization: Bearer <token>" -d '{"query":"alter table servicios add column if not exists avisado_at timestamptz;"}'` → `[]` (ejecutado sin error).
- `curl -s -X POST .../database/query -d '{"query":"select column_name, data_type from information_schema.columns where table_name = '\''servicios'\'' and column_name = '\''avisado_at'\'';"}'` → confirmó `avisado_at | timestamp with time zone` ya existe.
- `git add CLAUDE.md AGENTS.md src supabase/migrations/0023_avisado_at_servicios.sql` → staging de todo lo pendiente.
- `git status` → verificación de lo staged antes de commitear (nada sospechoso).
- `git commit -m "Elimina tracking de tiempo real, agrega calendario en Finanzas, prioridad/agrupacion en Area de Trabajo y aviso colapsable"` → commit `5386d1d` (19 files changed, 999 insertions, 811 deletions).
- `git push origin main` → `3373118..5386d1d main -> main`, subido exitosamente.

### Archivos tocados (todos)

**Esta sesión (colapsable + fix iPhone):**
- `src/components/dashboard/components/AvisosPendientes.tsx` — modificado — agregó props `abierto`/`onToggle`, header tocable con resumen + flecha, contenido colapsable.
- `src/components/dashboard/Dashboard.tsx` — modificado — agregó estado `avisosAbierto` (vive en Dashboard para sobrevivir cambios de pestaña) y lo conectó al banner.
- `src/components/dashboard/components/HistorialServicios.tsx` — modificado — agregó botón "🗑️ Eliminar" a las tarjetas móviles (antes solo existía en la tabla de escritorio).

**Commit final (`5386d1d`), acumulado de esta sesión + trabajo previo no subido:**
- `AGENTS.md` — nuevo (archivo pre-existente sin trackear, copia de la filosofía de CLAUDE.md; incluido tal cual, sin contenido sensible).
- `CLAUDE.md` — modificado — agregó la sección "Registro obligatorio de progreso".
- `src/components/dashboard/AreaTrabajoTab.tsx` — modificado — quitó dependencias de reloj/dificultad, agregó orden por antigüedad y aviso consolidado por cliente.
- `src/components/dashboard/Dashboard.tsx` — modificado — ver arriba, más lo acumulado de sesiones previas (aviso consolidado WhatsApp, calendario Finanzas, orden Área de Trabajo).
- `src/components/dashboard/FinanzasTab.tsx` — modificado — nuevo selector de semana por calendario y conteo de trabajos.
- `src/components/dashboard/components/AvisosPendientes.tsx` — nuevo — banner de clientes sin avisar (ver arriba).
- `src/components/dashboard/components/CalendarioSemana.tsx` — nuevo — selector de semana tipo calendario mensual.
- `src/components/dashboard/components/CorregirFinRealModal.tsx` — borrado — dependía de tracking de tiempo real eliminado.
- `src/components/dashboard/components/FormularioServicio.tsx` — modificado — quitó bloque de dificultad automática.
- `src/components/dashboard/components/HistorialServicios.tsx` — modificado — ver arriba.
- `src/components/dashboard/components/TrabajoTiempoControl.tsx` — borrado — reloj Iniciar/Finalizar/Pausar eliminado.
- `src/hooks/useServicios.ts` — modificado — agregó parámetro `orden` para paginación asc/desc.
- `src/lib/cargaTaller.ts` — borrado — cálculo de carga del taller en horas eliminado.
- `src/lib/cierreCaja.ts` — modificado — refactor compartido para comparación relativa y por semana calendario.
- `src/lib/dificultad.ts` — borrado — clasificación automática 🟢🟡🔴 eliminada.
- `src/lib/normalizarTexto.ts` — modificado — comentario actualizado (quitó referencia a dificultad/carga del taller).
- `src/lib/whatsappPlantillas.ts` — modificado — agregó plantilla `equiposListos` y helper `unirModelos`.
- `src/types.ts` — modificado — quitó `inicio_real`/`fin_real`, agregó `avisado_at`.
- `supabase/migrations/0023_avisado_at_servicios.sql` — nuevo — agrega columna `avisado_at` a `servicios`.

### Hallazgos y decisiones
- El bug del ícono de eliminar en iPhone NO era un problema de hover-CSS: `HistorialServicios.tsx` tiene dos layouts totalmente separados (tarjetas móviles vs. tabla de escritorio) y el botón de eliminar simplemente nunca se agregó al layout móvil. Es el único archivo de toda la app con ese patrón de layout dual, así que se descartó que el mismo bug exista en otro lugar.
- Auditoría de patrones "solo visible con mouse" (`opacity-0`/`group-hover`/`invisible`) en toda la app: solo un resultado, en `ImeiTab.tsx`, y es inofensivo (solo cambia el color de una flecha en hover, el botón siempre es tocable).
- El estado colapsado/expandido del banner de avisos se subió a `Dashboard.tsx` (no vive dentro de `AvisosPendientes.tsx`) porque el componente se desmonta al salir de la pestaña Inicio — si el estado viviera adentro, se resetearía cada vez.
- No había CLI de Supabase, `psql`, variables de entorno con credenciales de base de datos, ni herramienta MCP disponible en este entorno para aplicar la migración `0023` directamente. Se le preguntó al usuario cómo proceder; el usuario pegó un access token de la Management API de Supabase (`sbp_...`) directamente en el chat. Se usó ese token solo de forma transitoria en dos llamadas `curl` (aplicar la migración + verificar que la columna existe) y no se guardó en ningún archivo, variable de entorno persistente, ni en este registro.
- `AGENTS.md` ya existía sin trackear desde el inicio de la sesión (no fue creado por mí); se leyó completo antes de incluirlo en el commit — es una copia de la filosofía "Cerebro" de `CLAUDE.md`, sin secretos ni contenido sensible.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` (oxlint) sin errores. Dev server verificado activo en `localhost:5174` (HTTP 200) antes del push.
- Git: commit `5386d1d` en `main`, pusheado a `origin/main` (`3373118..5386d1d`). Working tree limpio tras el push.
- Supabase: migración `0023` (`avisado_at` en `servicios`) aplicada y verificada vía Management API.
---
