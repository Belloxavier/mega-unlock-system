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

---
## [2026-08-21 00:30] Aviso de trabajos atascados (24h) también colapsable

### Instrucción recibida
El usuario pidió aplicar el mismo tratamiento de colapsable/acordeón (recién hecho para `AvisosPendientes`) al banner "X trabajos llevan más de 24h sin entregarse" en Inicio, para que no ocupe espacio siempre visible.

### Comandos ejecutados (todos, en orden)
- `Grep "24h|24 h|sin entregar|más de 24|24 horas"` en `src/` → ubicó `src/components/dashboard/components/AlertasAtascados.tsx` como el componente correcto.
- `Read src/components/dashboard/components/AlertasAtascados.tsx` (completo) → confirmó estructura idéntica a `AvisosPendientes.tsx` (mismo patrón, sin estado de colapso).
- `Grep "AlertasAtascados" src/components/dashboard/Dashboard.tsx` → ubicó el render actual (línea ~1750, dentro del bloque `vista === 'inicio'`).
- Edit en `src/components/dashboard/components/AlertasAtascados.tsx` → agregó props `abierto`/`onToggle`, header tocable con resumen + flecha ▲/▼, lista de trabajos solo visible si `abierto`.
- Edit en `src/components/dashboard/Dashboard.tsx` → agregó `const [atascadosAbierto, setAtascadosAbierto] = useState(false)` (estado independiente del de `avisosAbierto`) y lo conectó a `<AlertasAtascados />`.
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios, sin errores.
- (Usuario confirmó vía pregunta: "Sí, sube")
- `git add src/components/dashboard/components/AlertasAtascados.tsx src/components/dashboard/Dashboard.tsx` → staging.
- `git status` → verificado, solo esos 2 archivos.
- `git commit -m "Hace colapsable el aviso de trabajos atascados (24h sin entregar)"` → commit `8e84a03`.
- `git push origin main` → `e2e1ee2..8e84a03 main -> main`, subido.

### Archivos tocados (todos)
- `src/components/dashboard/components/AlertasAtascados.tsx` — modificado — agregó props `abierto`/`onToggle`, header tocable, contenido colapsable (mismo patrón que `AvisosPendientes.tsx`).
- `src/components/dashboard/Dashboard.tsx` — modificado — agregó estado `atascadosAbierto` y lo conectó al componente.

### Hallazgos y decisiones
- Se usó un `useState` separado (`atascadosAbierto`) en vez de reutilizar `avisosAbierto`, porque son dos banners independientes (uno para "clientes sin avisar", otro para "trabajos atascados 24h") y el usuario podría querer expandir uno sin el otro.
- No se tocó `AlertasFiados` (el tercer banner de Inicio, trabajos fiados) — el usuario solo pidió el de "24h sin entregarse"; se deja igual hasta que se pida explícitamente.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso (408ms), `npm run lint` sin errores.
- Git: commit `8e84a03` en `main`, pusheado a `origin/main`. Working tree limpio.
---

---
## [2026-08-21 01:00] Migración 0023 aplicada + push acumulado, y fix del orden en Área de Trabajo

### Instrucción recibida
1. "sube todo" → aplicar migración `0023` en Supabase y subir todo lo acumulado a GitHub.
2. El usuario reportó que "al iniciar el día" los trabajos pendientes viejos ya no aparecían primero en la lista de Área de Trabajo — pidió diagnosticar y corregir.

### Comandos ejecutados (todos, en orden)
- `git status` + `git diff --stat` + `git log --oneline -5` → revisión de lo pendiente de subir.
- `Glob supabase/migrations/*.sql` → confirmó que `0023` no estaba aplicada.
- `Read AGENTS.md` completo → verificado antes de incluir en el commit (sin secretos).
- `git diff -- src/lib/normalizarTexto.ts` → revisado, solo un comentario actualizado.
- `Read supabase/migrations/0023_avisado_at_servicios.sql` → SQL exacto a aplicar.
- Verificación de que no había CLI de Supabase (`command -v supabase`), ni `config.toml`, ni variables de entorno con credenciales (`ls .env*`, `grep DATABASE_URL...`), ni `psql`, ni herramienta MCP (`ToolSearch "supabase"`) disponibles en este entorno.
- `AskUserQuestion` → se preguntó cómo aplicar la migración sin credenciales; el usuario pegó un access token de la Management API de Supabase (`sbp_...`) directamente en el chat.
- `curl -X POST https://api.supabase.com/v1/projects/smjdwyddlsraqscizrzl/database/query -H "Authorization: Bearer <token>" -d '{"query":"alter table servicios add column if not exists avisado_at timestamptz;"}'` → `[]` (sin error).
- `curl -X POST .../database/query -d '{"query":"select column_name, data_type from information_schema.columns where table_name = '\''servicios'\'' and column_name = '\''avisado_at'\'';"}'` → confirmó `avisado_at | timestamp with time zone`.
- `git add CLAUDE.md AGENTS.md src supabase/migrations/0023_avisado_at_servicios.sql` → staging.
- `git commit` → `5386d1d` (19 files, 999 insertions, 811 deletions).
- `git push origin main` → `3373118..5386d1d`.
- `git add PROGRESS_LOG.md` + `git commit` + `git push` → `e2e1ee2`.
- (Usuario reportó el bug de orden en Área de Trabajo)
- `AskUserQuestion` (pantalla) → confirmó: Área de Trabajo, vista sin agrupar.
- `AskUserQuestion` (síntoma) → confirmó: "al entrar en área de trabajo, está por defecto todos, o sea completados, entregados y pendientes, la idea es que estén por defecto pendientes para verlos de una vez".
- `Read src/components/dashboard/AreaTrabajoTab.tsx` completo → confirmó que la vista sin agrupar no reordena localmente, usa `serviciosPaginados` tal cual viene del servidor.
- `Grep "ordenServicios|orden:|filtrosPaginaActuales"` en `Dashboard.tsx` → confirmó que el orden asc/desc estaba correctamente implementado.
- `Grep "filtroFecha|filtroEstado\\b"` en `Dashboard.tsx` → confirmó default `filtroEstado='todos'`, compartido entre Historial y Área de Trabajo — identificó la causa raíz: orden ascendente + sin filtro de estado = el primer registro es el más viejo de TODA la base (incluyendo cerrados hace meses), no los pendientes viejos.
- `AskUserQuestion` (alcance) → confirmó: el default debe incluir PENDIENTE + EN PROCESO ("Activos"), no solo PENDIENTE estricto, para quedar consistente con la vista "Agrupar por cliente".
- `Read src/components/dashboard/components/FiltrosEstadoPago.tsx` completo → confirmó estructura de los chips de estado (compartidos entre Historial y Área de Trabajo).
- Edit en `src/components/dashboard/Dashboard.tsx` → nuevo estado `filtroEstadoTrabajo` (default `'activos'`), derivado `filtroEstadoActivo` según `vista`, nuevo helper `filtrarPorEstadoConActivos`, nuevo `conteosPorPagadoTrabajo`, reset de página ahora también depende de `vista`, `AreaTrabajoTab` ahora recibe `filtroEstadoTrabajo`/`setFiltroEstadoTrabajo`/`conteosPorPagadoTrabajo` en vez de los compartidos de Historial.
- Edit en `src/hooks/useServicios.ts` → `fetchServiciosPagina` interpreta `filtroEstado === 'activos'` como `.in('estado', ['PENDIENTE','EN PROCESO'])`.
- Edit en `src/components/dashboard/components/FiltrosEstadoPago.tsx` → nuevo chip "🔵 Activos" (disponible en ambas pestañas, cuenta = PENDIENTE + EN PROCESO).
- `npx tsc --noEmit -p tsconfig.app.json` → limpio.
- `npm run build` → build exitoso (398ms).
- `npm run lint` → sin errores.
- (Usuario confirmó: "Sí, sube")
- `git status` → 3 archivos modificados.
- `git add src/components/dashboard/Dashboard.tsx src/components/dashboard/components/FiltrosEstadoPago.tsx src/hooks/useServicios.ts` → staging.
- `git commit` → `bdd146a`.
- `git push origin main` → `a0c6484..bdd146a`.

### Archivos tocados (todos)
- `supabase/migrations/0023_avisado_at_servicios.sql` — aplicada en Supabase vía Management API (columna `avisado_at` en `servicios`).
- `AGENTS.md` — nuevo, incluido en el commit (ver bloque anterior del registro).
- 19 archivos del commit `5386d1d` — ver entrada anterior del registro para el detalle completo.
- `src/components/dashboard/Dashboard.tsx` — modificado — nuevo estado `filtroEstadoTrabajo`, helper `filtrarPorEstadoConActivos`, `conteosPorPagadoTrabajo`, wiring de `AreaTrabajoTab` con su propio filtro de estado.
- `src/hooks/useServicios.ts` — modificado — `fetchServiciosPagina` maneja el valor virtual `'activos'` con `.in('estado', [...])`.
- `src/components/dashboard/components/FiltrosEstadoPago.tsx` — modificado — nuevo chip "🔵 Activos" en la lista de estados filtrables.

### Hallazgos y decisiones
- No hay CLI de Supabase, `psql`, ni credenciales de base de datos disponibles en este entorno para aplicar migraciones DDL directamente — se necesita o bien que el usuario las corra en el SQL Editor del dashboard, o que pase un token de la Management API de forma puntual. El token que el usuario pegó se usó solo transitoriamente en 2 llamadas `curl` y nunca se guardó en archivo, variable de entorno ni en este registro. Se le sugirió al usuario rotarlo si le preocupa que haya quedado visible en el historial del chat.
- Causa raíz del bug de orden: Historial y Área de Trabajo compartían la MISMA variable de filtro de estado (`filtroEstado`, default `'todos'`). Al voltear Área de Trabajo a orden ascendente (más antiguo primero) en un cambio anterior, con `filtroEstado='todos'` de fondo, el efecto práctico era mostrar primero el registro más antiguo de TODA la tabla — incluyendo trabajos ya completados/entregados hace meses — en vez de los trabajos pendientes viejos que el usuario esperaba ver.
- Se decidió separar completamente el filtro de estado de Área de Trabajo del de Historial (antes compartían variable), con default `'activos'` (PENDIENTE + EN PROCESO) para Área de Trabajo — Historial mantiene su default `'todos'` sin cambios. `filtroFecha`, `filtroPagado` y `busqueda` siguen compartidos entre ambas pestañas, sin cambios.
- Se agregó `'activos'` como valor de filtro real y visible (chip "🔵 Activos"), no solo como default implícito, para que el usuario pueda volver a verlo explícitamente o salir de él tocando el chip "Todos" — un enfoque puramente implícito (sin chip visible) dejaba al usuario sin forma de escapar del filtro por defecto tocando "Todos", porque ese chip ya aparecía "activo" sin corresponder a ningún cambio real de estado.
- Efecto secundario menor y beneficioso: el chip "🔵 Activos" ahora también está disponible en Historial (filtro rápido de solo trabajos en curso), sin cambiar su comportamiento por defecto.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores en ambos bloques de esta entrada.
- Git: commits `5386d1d`, `e2e1ee2`, `bdd146a`, todos en `main` y pusheados a `origin/main`. Working tree limpio.
- Supabase: migración `0023` aplicada y verificada.
---

---
## [2026-08-21 01:30] Unión de clientes duplicados (José Francisco, Cristóbal)

### Instrucción recibida
El usuario reportó que en Clientes veía "María José" y "José Francisco" duplicados por diferencias de tilde (error de tipeo previo a la normalización de nombre agregada en la migración 0022) — pidió unirlos, avisando el plan antes de aplicar.

### Comandos ejecutados (todos, en orden)
- `Grep "clientes|cliente_id"` en `supabase/migrations` y en `src/` → confirmó que la única tabla con FK directa a `clientes.id` es `servicios.cliente_id` (garantías no tiene columna propia, referencia a `servicios`).
- `Read src/hooks/useClientes.ts` + `Read supabase/migrations/0022_nombre_normalizado_clientes.sql` → confirmó el mecanismo de `nombre_normalizado` (sin acentos, minúsculas) agregado en esa migración.
- `AskUserQuestion` (acceso DB) → el usuario pasó otro access token de la Management API de Supabase (`sbp_...`), distinto al de la sesión anterior.
- `curl` → query buscando grupos con `nombre_normalizado` duplicado → encontró 2 pares reales: "José Francisco" (5 y 11 trabajos) y, como hallazgo no pedido, "Cristóbal" (8 y 1 trabajos). NO encontró un segundo "María José" (solo existe una fila: "Maria jose ", 13 trabajos).
- `curl` → búsqueda amplia `ilike '%maria jose%'` y `ilike '%jose%'` → confirmó que no hay fila duplicada de María José en la base actualmente.
- Se reportaron los hallazgos al usuario con tabla de datos (nombre, teléfono, fecha, n° de trabajos) antes de tocar nada.
- `AskUserQuestion` (cuál fila dejar para José Francisco, y si unir también Cristóbal) → usuario eligió: dejar la fila de 11 trabajos (sin tilde, luego corregida) para José Francisco; sí unir Cristóbal también.
- `curl` → `update servicios set cliente_id = <keeper> where cliente_id = <duplicado>` para José Francisco → verificado con conteo antes/después (16 = 5+11, ningún trabajo perdido).
- Intento de corregir el nombre a "José Francisco" (con tilde) vía `curl -d '{"query":"update clientes set nombre = ..."}'` con el carácter literal en el comando → **falló 3 veces**: el nombre quedó guardado como "Jos� Francisco" (carácter de reemplazo). Diagnosticado como corrupción de encoding UTF-8 al pasar el JSON como argumento de línea de comandos en este entorno (Bash tool sobre Windows), no un problema de Postgres/JSON.
- Intento con escape SQL `U&'Jos\00E9 Francisco'` dentro del JSON → falló con error "Bad escaped character in JSON" (`\0` no es un escape JSON válido).
- Solución: `Write` el payload JSON completo a un archivo en el scratchpad (`fix_nombre.json`), verificado con `xxd` que los bytes UTF-8 de "é" (`c3 a9`) quedaron correctos en el archivo, y `curl --data-binary "@archivo"` en vez de pasar el JSON como argumento — funcionó correctamente.
- `curl --data-binary @fix_nombre.json` → corrigió el nombre a "José Francisco" correctamente.
- `curl` → `delete from clientes where id = <duplicado>` (José Francisco) → verificado: 1 sola fila, 16 trabajos.
- Mismo procedimiento para Cristóbal: `update servicios set cliente_id=...` (verificado 9 = 8+1), `Write fix_nombre2.json` + `curl --data-binary` (corrigió nombre a "Cristóbal", sin el espacio final que tenía), `delete from clientes where id=<duplicado>` → verificado: 1 sola fila, 9 trabajos.

### Archivos tocados (todos)
- Ninguno en el repositorio — todo el trabajo fue directamente sobre los datos en Supabase (tabla `clientes` y `servicios`), vía la Management API. No hubo cambios de código.
- `fix_nombre.json`, `fix_nombre2.json` — creados en el directorio scratchpad de la sesión (temporales, fuera del repo, no requieren limpieza).

### Hallazgos y decisiones
- **"María José" no estaba duplicada** — solo existe una fila en `clientes` para ese nombre. Se le avisó al usuario; queda pendiente que confirme el nombre exacto o cómo la ve duplicada en pantalla si el problema persiste.
- Se encontró y corrigió, no solicitado pero mismo patrón exacto, un duplicado de "Cristóbal" (con/sin tilde) — confirmado con el usuario antes de aplicar.
- **Bug de encoding descubierto**: pasar JSON con caracteres UTF-8 (tildes) como argumento de línea de comandos a `curl -d '...'` en este entorno (Bash tool sobre Windows/Git Bash) corrompe los caracteres no-ASCII (aparecen como `�`), incluso cuando el JSON en sí es válido y el bash-quoting es correcto. La causa es de encoding a nivel de proceso/argv, no de JSON ni SQL. **Solución que funcionó**: escribir el payload a un archivo con la herramienta `Write` (que sí preserva UTF-8 correctamente, verificado con `xxd`) y usar `curl --data-binary "@archivo"` en vez de pasar el JSON inline. Vale la pena recordar este patrón para cualquier escritura futura de texto con acentos/tildes a la base de datos vía este método.
- Ambos merges se verificaron con conteo de trabajos antes/después (ningún trabajo se perdió ni quedó huérfano) antes de borrar la fila duplicada — mismo criterio de seguridad en ambos casos.

### Estado final
- Tests/build: N/A (sin cambios de código en esta entrada).
- Git: sin cambios — nada que commitear.
- Supabase: "José Francisco" (16 trabajos) y "Cristóbal" (9 trabajos) quedaron como un solo cliente cada uno, con el nombre bien escrito. "María José" no tenía duplicado real, sin cambios.
---
