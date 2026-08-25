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

---
## [2026-08-21 02:00] Búsqueda de historial por cliente + fix de "Agrupar por cliente" con filtro Completado

### Instrucción recibida
1. Agregar en la pestaña Clientes una búsqueda por cliente que muestre todos sus trabajos.
2. Bug reportado: en Área de Trabajo, si se selecciona el filtro "Completado" y luego se activa "Agrupar por cliente", no muestra nada — solo funciona con "Pendientes".

### Comandos ejecutados (todos, en orden)
- `Grep "trabajosActivosAgrupados"` en `Dashboard.tsx` → confirmó que ese memo estaba hardcodeado a `s.estado === 'PENDIENTE' || s.estado === 'EN PROCESO'`, ignorando por completo el filtro de estado seleccionado (`filtroEstadoTrabajo`) — causa raíz del bug.
- `Read` completo de esa sección (líneas ~1375-1414) para entender la lógica de agrupación/orden antes de tocarla.
- Edit en `Dashboard.tsx` → `trabajosActivosAgrupados` ahora usa `filtrarPorEstadoConActivos(servicios, filtroEstadoTrabajo)` en vez del filtro fijo; se agregó `filtroEstadoTrabajo` a las dependencias del `useMemo`.
- `Read` de `AreaTrabajoTab.tsx` (bloque de renderizado agrupado/sin agrupar, líneas ~190-260) para planear dónde mover los chips de Estado/Pago.
- Edit en `AreaTrabajoTab.tsx` → se movió `<FiltrosEstadoPago>` fuera del condicional `vistaAgrupada` para que se vea SIEMPRE (antes solo se mostraba en la vista sin agrupar, así que en la vista agrupada no había forma de ver ni cambiar qué filtro estaba activo); se quitó el texto fijo "Solo trabajos PENDIENTE o EN PROCESO..." (ya no es cierto siempre) y se actualizó el mensaje de lista vacía a uno genérico.
- `npx tsc --noEmit -p tsconfig.app.json` → limpio, confirmó el fix del bug antes de seguir.
- `Read src/components/dashboard/ClientesTab.tsx` completo → confirmó que la pestaña solo tenía rankings/estadísticas, sin lista de clientes ni búsqueda.
- `Grep "normalizarNombre|normalizarTexto"` en `Dashboard.tsx` → confirmó que ya estaba importado (reutilizado de features anteriores).
- `Grep "ClientesTab|filtroFechaClientes|filtroTipoContacto"` en `Dashboard.tsx` → ubicó dónde agregar el nuevo estado/memo y el punto de render de `<ClientesTab>`.
- Edit en `Dashboard.tsx` → nuevo estado `busquedaClienteHistorial`; nuevo memo `resultadosBusquedaCliente` (agrupa TODA la tabla `servicios` en memoria por cliente normalizado que calce con el texto buscado en nombre o teléfono, sin límite de fecha/estado — a diferencia de Historial/Área de Trabajo que sí pagina/filtra); wiring de las 3 nuevas props hacia `<ClientesTab>`.
- Edit en `ClientesTab.tsx` → nueva tarjeta "Buscar cliente" arriba de todo, con input de búsqueda y, si hay texto, la lista de clientes que calzan con su historial completo (folio, modelo, tipo de trabajo, fecha, badge de estado con color, monto por trabajo, y total del cliente).
- `npx tsc --noEmit -p tsconfig.app.json` → limpio.
- `npm run build` → build exitoso (1.92s).
- `npm run lint` → sin errores.
- (Usuario confirmó: "Sí, sube")
- `git status` → 3 archivos modificados.
- `git add src/components/dashboard/AreaTrabajoTab.tsx src/components/dashboard/ClientesTab.tsx src/components/dashboard/Dashboard.tsx` → staging.
- `git commit -m "Agrega busqueda de historial por cliente en Clientes, corrige Agrupar por cliente con filtro Completado"` → commit `c3775be`.
- `git push origin main` → `e9a957a..c3775be`.

### Archivos tocados (todos)
- `src/components/dashboard/Dashboard.tsx` — modificado — `trabajosActivosAgrupados` ahora respeta `filtroEstadoTrabajo`; nuevo estado y memo `resultadosBusquedaCliente` para la búsqueda por cliente; wiring hacia `AreaTrabajoTab`/`ClientesTab`.
- `src/components/dashboard/AreaTrabajoTab.tsx` — modificado — `FiltrosEstadoPago` ahora se muestra también en la vista agrupada; se quitó el texto fijo desactualizado y se generalizó el mensaje de lista vacía.
- `src/components/dashboard/ClientesTab.tsx` — modificado — nueva sección "Buscar cliente" (input + resultados agrupados con historial completo por cliente).

### Hallazgos y decisiones
- Causa raíz del bug: `trabajosActivosAgrupados` se calculó originalmente (en una sesión anterior) con un filtro fijo a PENDIENTE/EN PROCESO porque en ese momento no existía ningún filtro de estado seleccionable para Área de Trabajo — cuando se agregó `filtroEstadoTrabajo` (sesión anterior, fix del orden por antigüedad), ese memo quedó desconectado del nuevo estado, y nadie lo notó hasta que el usuario probó "Completado" + agrupar.
- Se decidió mostrar los chips de Estado/Pago SIEMPRE en Área de Trabajo (agrupado o no), no solo condicionalmente, para que el usuario pueda ver y cambiar el filtro activo sin tener que salir de la vista agrupada.
- La búsqueda de clientes reutiliza la tabla `servicios` completa que YA vive en memoria en `Dashboard.tsx` (la misma que usan Finanzas/rankings/avisos) — no se agregó ninguna consulta nueva a Supabase, es puro filtrado en el cliente, igual que `trabajosActivosAgrupados`.
- Deliberadamente NO se filtró la búsqueda por `filtroFechaClientes`/`filtroTipoContacto` (los filtros de periodo/tipo de la pestaña Clientes) — el pedido fue "muéstrame TODOS los trabajos de ese cliente", así que la búsqueda ignora esos filtros a propósito y siempre trae el historial completo.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso (1.92s), `npm run lint` sin errores.
- Git: commit `c3775be` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---

---
## [2026-08-25 00:00] Etiqueta de equipo (uso interno) al imprimir el ticket

### Instrucción recibida
El usuario pidió opinión sobre agregar una segunda papeleta al imprimir (además del ticket del cliente): una etiqueta para pegar en el equipo mismo, con cliente, trabajo, número, precio, fecha, y campos útiles tipo checklist (chip, abono, pago). Pidió opinión antes de implementar, luego iteró el diseño varias veces en conversación (quitar cargador, cambiar chip/cámaras por "periférico" genérico ya que reciben equipos desarmados de otros técnicos, agregar recuadro de patrón + línea de PIN, simplificar abono a un solo campo, agregar teléfono, quitar la línea de "Equipo" porque el técnico ya tiene el celular en la mano).

### Comandos ejecutados (todos, en orden)
- `Grep "handleImprimirFolio|onImprimirFolio|imprimirFolio"` en `Dashboard.tsx` → ubicó la función de impresión actual.
- `Read` de `handleImprimirFolio` (líneas 869-902) → confirmó que hoy imprime UNA sola papeleta de 58mm (ticket del cliente: folio, equipo, servicio, fecha, monto).
- Varias rondas de `AskUserQuestion` + mockups en texto plano (el usuario no podía ver el campo `preview` de la pregunta, así que se mostró el mockup directamente en el cuerpo del mensaje en las rondas siguientes) para acordar: qué significa "número" (folio, elegido), si el botón imprime ambas papeletas de una vez o dos botones separados (una sola impresión, elegido), y el contenido final campo por campo.
- Edit en `Dashboard.tsx` → `handleImprimirFolio` ahora escribe DOS bloques en la misma ventana de impresión, separados por `page-break-after: always` en el primero: el ticket del cliente (sin cambios de contenido) y una nueva "etiqueta de equipo" con folio, cliente, teléfono, trabajo, fecha, precio, casillero de Periférico (Sí/No), grilla de 3x3 puntos para dibujar el patrón, línea para PIN/contraseña, línea para abono y línea para notas.
- `npx tsc --noEmit -p tsconfig.app.json` → limpio.
- `npm run build` → build exitoso (410ms).
- `npm run lint` → sin errores.
- (Usuario confirmó: "Sí, sube")
- `git status` → 1 archivo modificado.
- `git add src/components/dashboard/Dashboard.tsx` → staging.
- `git commit -m "Agrega etiqueta de equipo (uso interno) al imprimir el ticket del cliente"` → commit `55aec32`.
- `git push origin main` → `90e4665..55aec32`.

### Archivos tocados (todos)
- `src/components/dashboard/Dashboard.tsx` — modificado — `handleImprimirFolio` ahora imprime ticket del cliente + etiqueta de equipo en el mismo trabajo de impresión.

### Hallazgos y decisiones
- El diseño final de la etiqueta quedó definido en varias rondas de iteración con el usuario (no fue una sola pasada) — campos finales: Folio, Cliente, Teléfono, Trabajo, Fecha, Precio, Periférico (Sí/No), Patrón (grilla 3x3 para dibujar a mano), PIN/Contraseña (línea para escribir), Abono ($ línea), Notas (línea). Se descartaron en el camino: Equipo/modelo (irrelevante, el técnico tiene el celular en la mano), Cargador (no lo reciben), Chip y Cámaras por separado (se fusionaron en "Periférico" genérico porque reciben equipos desarmados de otros técnicos, no consumidores finales), y "Pago completo Sí/No" (se simplificó a solo la línea de Abono).
- Los casilleros/líneas se imprimen vacíos — se llenan a mano con lápiz al recibir el equipo, la app no tiene esos datos.
- No se agregó ninguna consulta ni columna nueva a la base de datos — es puro HTML/CSS generado a partir de datos que el `Servicio` ya tiene (folio, cliente, teléfono, tipo_trabajo, fecha, monto).
- Nota de proceso: el campo `preview` de `AskUserQuestion` no se le mostraba al usuario en su cliente — para las rondas de mockup hubo que poner el ejemplo en texto plano directamente en el cuerpo del mensaje en vez de en el parámetro de preview.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: commit `55aec32` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---

---
## [2026-08-25 00:30] Imprimir se separa en dos: Etiqueta cliente / Etiqueta local

### Instrucción recibida
El usuario reconsideró el fix anterior (dos papeletas en un mismo trabajo de impresión, separadas por `page-break`): no tiene con qué cortar a mano, pero la impresora térmica sí corta automático — solo que únicamente al final de cada trabajo de impresión, no en medio de un salto de página CSS. Pidió no separar en dos botones visibles, sino que el botón de Imprimir deje ELEGIR qué parte imprimir, con nombres "Etiqueta cliente" y "Etiqueta local".

### Comandos ejecutados (todos, en orden)
- `Grep "handleImprimirFolio|onImprimirFolio"` en `Dashboard.tsx` → confirmó los 2 puntos de wiring (la función y su uso en `HistorialServicios`).
- `Read src/components/dashboard/components/ConfirmSheet.tsx` → evaluado como posible reutilización para el picker de 2 opciones, descartado: su fondo (`backdrop`) llama a `onCancel` al tocar afuera, y mapear una opción real (no un "cancelar") a ese slot habría disparado una impresión accidental al cerrar tocando afuera.
- `Read src/components/dashboard/components/EditorFechaPago.tsx` → confirmado como el patrón correcto a imitar: botón disparador + popover posicionado, con un overlay invisible que solo CIERRA (no ejecuta ninguna acción) al tocar afuera.
- `Write src/components/dashboard/components/MenuImprimir.tsx` → nuevo componente: botón disparador configurable (`triggerClassName`/`children`) + popover con dos opciones reales ("🧾 Etiqueta cliente" / "🏷️ Etiqueta local"), cada una imprime por separado (llamadas independientes, no relacionadas entre sí).
- Edit en `Dashboard.tsx` → separó `handleImprimirFolio` (sin cambios de contenido, vuelve a ser un solo ticket) de la nueva `handleImprimirEtiquetaEquipo` (la etiqueta de equipo, ahora en su propia ventana/trabajo de impresión); nuevo estado `imprimirMenuAbierto` (qué fila tiene el menú abierto); wiring hacia `HistorialServicios` con `onToggleImprimirMenu`/`onImprimirCliente`/`onImprimirEtiqueta` en vez del único `onImprimirFolio`.
- Edit en `HistorialServicios.tsx` (props + tarjeta móvil + tabla de escritorio) → reemplazó el botón directo de imprimir por `<MenuImprimir>` en ambos layouts (móvil: botón de ancho completo "🖨️ Imprimir"; escritorio: ícono compacto "🖨️" en la columna de Acciones).
- `npx tsc --noEmit -p tsconfig.app.json` → limpio.
- `npm run build` → build exitoso (382ms).
- `npm run lint` → sin errores.
- (Usuario confirmó: "Sí, sube")
- `git status` → 2 archivos modificados + 1 nuevo.
- `git add src/components/dashboard/Dashboard.tsx src/components/dashboard/components/HistorialServicios.tsx src/components/dashboard/components/MenuImprimir.tsx` → staging.
- `git commit -m "Convierte el boton de imprimir en un menu: Etiqueta cliente o Etiqueta local, cada una por separado"` → commit `4c3e134`.
- `git push origin main` → `0619491..4c3e134`.

### Archivos tocados (todos)
- `src/components/dashboard/components/MenuImprimir.tsx` — nuevo — botón disparador + popover con las dos opciones de impresión.
- `src/components/dashboard/Dashboard.tsx` — modificado — `handleImprimirFolio` vuelve a ser un solo ticket; nueva `handleImprimirEtiquetaEquipo` separada; nuevo estado `imprimirMenuAbierto`; wiring actualizado hacia `HistorialServicios`.
- `src/components/dashboard/components/HistorialServicios.tsx` — modificado — botón de imprimir (móvil y escritorio) reemplazado por `MenuImprimir`.

### Hallazgos y decisiones
- Se descartó reutilizar `ConfirmSheet` (ya usado en otras partes de la app para elegir entre dos acciones reales, ej. "Enviar aviso ahora"/"Esperar a los demás") porque en ESE caso la opción del lado "cancelar" era equivalente a "no hacer nada ahora", lo cual coincide con lo que hace tocar el fondo. Acá las dos opciones son acciones reales igualmente válidas (imprimir una cosa u otra), así que usar el slot de "cancelar" para una de ellas habría hecho que tocar fuera del cuadro disparara una impresión sin querer — se optó por un popover nuevo (mismo patrón que `EditorFechaPago`/`EstadoControl`) donde tocar afuera SOLO cierra, nunca ejecuta.
- El contenido de ambas papeletas (ticket del cliente y etiqueta de equipo) no cambió respecto a la entrada anterior del registro — solo cambió CÓMO se disparan: antes en un mismo trabajo de impresión con salto de página, ahora cada una en su propia ventana/trabajo, elegido desde un menú.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: commit `4c3e134` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---

---
## [2026-08-25 01:00] Memoria de prioridad iPhone + fix de overflow en el menú de imprimir

### Instrucción recibida
1. El usuario pidió recordar, como regla permanente, que este programa se usa más en iPhone que en cualquier otro dispositivo — prioridad siempre iPhone sobre Android.
2. Mandó una captura de pantalla mostrando el nuevo menú de imprimir (`MenuImprimir`) abriéndose hacia la derecha y saliéndose de la pantalla, cortando el texto de las opciones ("Etiqueta clie...", "Etiqueta loc...").

### Comandos ejecutados (todos, en orden)
- `Write` de `feedback_iphone_priority.md` en el directorio de memoria del proyecto (fuera del repo de código) → nueva memoria tipo `feedback` con la regla y el contexto (el bug del botón de eliminar ausente en móvil, de una sesión anterior en esta misma conversación, como precedente concreto de por qué importa).
- `Read` + `Edit` de `MEMORY.md` (índice de memoria) → agregó la línea apuntando a la nueva memoria.
- Análisis de la captura enviada por el usuario → confirmó que el popover de `MenuImprimir` (agregado en la entrada anterior de este registro) usaba `alinear="left"` en el ícono de escritorio, que queda cerca del borde derecho de la columna "Acciones" — el popover de 192px de ancho se abría hacia la derecha y se salía del viewport, cortando el texto.
- `Grep "alinear=\"left\""` en `HistorialServicios.tsx` → ubicó las 2 instancias de `MenuImprimir` (móvil y escritorio).
- Edit en `HistorialServicios.tsx` (x2) → cambió `alinear="left"` a `alinear="right"` en ambas instancias de `MenuImprimir` (escritorio: confirmado por la captura; móvil: preventivo, mismo riesgo potencial ya que la posición del botón de imprimir en la fila varía según qué otros botones se muestran condicionalmente).
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios.
- (Usuario confirmó: "Sí, sube")
- `git add src/components/dashboard/components/HistorialServicios.tsx` → staging.
- `git commit -m "Fix: el menu de imprimir se salia de pantalla, ahora abre hacia la izquierda"` → commit `d25100c`.
- `git push origin main` → `e635357..d25100c`.

### Archivos tocados (todos)
- `feedback_iphone_priority.md` (memoria, fuera del repo) — nuevo — regla permanente de priorizar iPhone.
- `MEMORY.md` (memoria, fuera del repo) — modificado — nueva línea de índice.
- `src/components/dashboard/components/HistorialServicios.tsx` — modificado — `MenuImprimir` ahora abre hacia la izquierda (`alinear="right"`) en vez de hacia la derecha, en ambos layouts.

### Hallazgos y decisiones
- El bug fue introducido en la entrada anterior de este mismo registro (el nuevo `MenuImprimir`) — no se detectó en la verificación de `tsc`/`build`/`lint` porque es un bug puramente visual/de layout (overflow fuera del viewport), no de tipos ni de lógica; solo se hizo evidente con la captura real del usuario. Sirve de recordatorio de que estas verificaciones automáticas no reemplazan probar la UI de verdad.
- Se aplicó el mismo fix preventivamente en el layout móvil aunque la captura solo mostraba el bug en escritorio, porque el mismo razonamiento geométrico (popover ancho abriendo hacia el lado donde hay menos espacio) aplica ahí también y la posición del botón dentro de la fila de acciones móvil no es fija.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: commit `d25100c` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---

---
## [2026-08-25 01:30] Fix: editar un trabajo perdía en silencio los cambios de teléfono/nombre del cliente

### Instrucción recibida
El usuario reportó: crea un cliente, luego quiere editarlo para agregar o cambiar el número de teléfono, y "no me deja, se bugea".

### Comandos ejecutados (todos, en orden)
- `Read` de `handleGuardarServicio` (rama `if (editandoId)`, líneas 366-420) → revisó el flujo completo de guardado al editar un trabajo.
- `Grep "handleIniciarEdicion"` en `Dashboard.tsx` → confirmó que sí setea `clienteIdAsociado` correctamente desde `s.clientes?.id` al abrir la edición.
- `Read supabase/migrations/0012_endurece_rls.sql` → descartada la hipótesis de que RLS bloqueara el UPDATE de `clientes` (política `to authenticated using (true)`, sin restricción de fila).
- `Grep "handleCambiarNombre|handleSeleccionarCliente|setClienteIdAsociado"` en `Dashboard.tsx` → **encontró la causa raíz**: `handleCambiarNombre` (disparado en cada `onChange` del campo Nombre) pone `clienteIdAsociado` en `null` incondicionalmente — correcto para el flujo de "crear trabajo nuevo" (para no seguir apuntando al cliente equivocado si se escribe un nombre distinto), pero roto para "editar trabajo": el bloque `if (clienteIdAsociado) { ...update clientes... }` de la rama de edición simplemente no se ejecutaba si el usuario tocaba el campo Nombre (aunque fuera solo para revisarlo) mientras cambiaba el teléfono — el cambio se perdía sin ningún aviso de error.
- Edit en `Dashboard.tsx` (rama `if (editandoId)` de `handleGuardarServicio`) → reescrita para: si `clienteIdAsociado` es null al guardar, buscar por nombre exacto (`buscarClientePorNombreExacto`, igual que ya hacía la rama de creación) y, si tampoco existe, crear el cliente — y ahora SÍ se actualiza `servicios.cliente_id` con el resultado (antes nunca se tocaba esa columna en la rama de edición). Se agregó manejo de error real (`clienteError`) en vez de ignorar silenciosamente el resultado del `.update()`.
- Edit adicional en la rama de creación (`if (clienteId && !clienteEsNuevo)`, ~línea 505) → mismo fix defensivo: ahora revisa y reporta el error del `.update()` de `clientes` en vez de ignorarlo (mismo patrón de bug potencial, aunque no confirmado como la causa de este reporte específico).
- `npx tsc --noEmit -p tsconfig.app.json` → limpio.
- `npm run build` → build exitoso (374ms).
- `npm run lint` → sin errores.
- (Usuario confirmó: "Sí, sube")
- `git add src/components/dashboard/Dashboard.tsx` → staging.
- `git commit -m "Fix: editar un trabajo perdia en silencio los cambios de telefono/nombre del cliente"` → commit `51f90c9`.
- `git push origin main` → `461b487..51f90c9`.

### Archivos tocados (todos)
- `src/components/dashboard/Dashboard.tsx` — modificado — `handleGuardarServicio` (ambas ramas: editar y crear) ahora resuelve/crea el cliente correctamente y reporta errores en vez de ignorarlos en silencio.

### Hallazgos y decisiones
- El bug NO era de la base de datos ni de RLS — era puramente de lógica en el cliente: `clienteIdAsociado` se ponía en `null` por diseño al tocar el nombre (para no reasociar accidentalmente el trabajo al cliente equivocado), pero la rama de EDICIÓN nunca tuvo el mismo mecanismo de re-búsqueda/creación que ya existía en la rama de CREACIÓN — quedaba huérfana, sin actualizar nada y sin avisar.
- Efecto secundario correcto (no un bug nuevo): si mientras editas un trabajo cambias el Nombre a una persona distinta, el trabajo ahora se re-asocia de verdad a esa otra persona (buscándola o creándola) en vez de, como antes, dejar el `cliente_id` original intacto sin avisar — esto es el comportamiento esperado, no estaba pedido explícitamente pero es la consecuencia correcta de arreglar el bug reportado.
- Se corrigió el mismo patrón de error silencioso (ignorar el resultado de `.update()` en `clientes`) en la rama de creación como medida preventiva, aunque no se confirmó que fuera la causa de este reporte específico.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: commit `51f90c9` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---

---
## [2026-08-25 02:00] "Ver todos" en los rankings de Clientes (antes cortaban en el top 8)

### Instrucción recibida
El usuario notó que en la pestaña Clientes, al filtrar por Técnicos o Clientes, los rankings ("Top por Dinero", "Top por Cantidad de Trabajos") solo muestran el top 8 — pero las tarjetas de arriba (Clientes Únicos, Trabajos Realizados, Dinero Generado) son el total real, así que sumar el top 8 nunca calzaba con esas cifras. Pidió opinión sobre agregar un desglose completo.

### Comandos ejecutados (todos, en orden)
- Se dio la opinión primero (sin implementar): recomendé expandir en el mismo lugar ("Ver todos") en vez de un modal aparte, por ser más simple y reutilizar la UI existente.
- `AskUserQuestion` → el usuario confirmó: expandir en el mismo lugar.
- `Grep "rankingPorDinero|rankingPorVisitas|\\.slice\\(0, 8\\)"` en `Dashboard.tsx` → ubicó los 3 puntos donde se cortaba a 8 (`rankingPorDinero`, `rankingPorVisitas`, `rankingPorTipoTrabajo`).
- `Read` de la sección completa del cálculo (líneas ~1560-1657) para entender la estructura antes de tocarla.
- Edit en `Dashboard.tsx` (x2) → se quitó `.slice(0, 8)` de los 3 rankings — ahora Dashboard.tsx manda la lista COMPLETA, sin límite artificial.
- `Read` completo de `ClientesTab.tsx` (post cambios de sesiones anteriores) para planear dónde insertar el toggle.
- Edit en `ClientesTab.tsx` → import de `useState`, constante `TOPE_RANKING = 8`, 3 estados locales (`verTodosDinero`/`verTodosVisitas`/`verTodosTipo`), y en cada uno de los 3 bloques de ranking: la lista renderizada usa `.slice(0, TOPE_RANKING)` solo si el toggle está apagado, contenedor con `max-h-96 overflow-y-auto` cuando está expandido, y un botón "▼ Ver todos (N)" / "▲ Ver menos" debajo de cada lista (solo visible si hay más de 8 elementos).
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios.
- (Usuario confirmó: "Sí, sube")
- `git add src/components/dashboard/Dashboard.tsx src/components/dashboard/ClientesTab.tsx` → staging.
- `git commit -m "Agrega Ver todos a los rankings de Clientes (antes cortaban en el top 8)"` → commit `7fbad9b`.
- `git push origin main` → `0bc086b..7fbad9b`.

### Archivos tocados (todos)
- `src/components/dashboard/Dashboard.tsx` — modificado — los 3 rankings (`rankingPorDinero`, `rankingPorVisitas`, `rankingPorTipoTrabajo`) ya no se cortan a 8, mandan la lista completa.
- `src/components/dashboard/ClientesTab.tsx` — modificado — cada ranking tiene su propio toggle "Ver todos"/"Ver menos", mostrando por defecto solo los primeros 8 (mismo comportamiento visual que antes) pero con opción de ver el resto sin salir de la pestaña.

### Hallazgos y decisiones
- El límite de 8 se movió de donde se CALCULA el dato (Dashboard.tsx) a donde se MUESTRA (ClientesTab.tsx) — Dashboard.tsx ahora siempre manda todo, y es la vista la que decide cuánto mostrar por defecto. Esto es más correcto en general: cualquier otro consumidor futuro de esos rankings no hereda un límite arbitrario que no le corresponde.
- No se tocó el ranking "Por Tipo de Trabajo" en la instrucción original del usuario (solo mencionó clientes/técnicos), pero comparte exactamente el mismo patrón de corte a 8 — se le aplicó el mismo fix por consistencia, ya que dejarlo a medias hubiera sido inconsistente sin motivo.
- Se usó `max-h-96 overflow-y-auto` en la lista expandida para que un ranking con muchos clientes (ej. 100+) no estire la página verticalmente sin límite.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: commit `7fbad9b` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---

---
## [2026-08-25 02:30] Auditoría y limpieza de la pestaña Finanzas

### Instrucción recibida
El usuario pidió revisar toda la pestaña Finanzas — le confundía "Semana actual vs anterior", "Mes actual vs anterior", y específicamente no entendía qué significaba "Días con cobro: 23". Pidió una revisión completa de qué tan útil es cada cosa y recomendaciones antes de aplicar nada.

### Comandos ejecutados (todos, en orden)
- `Read` completo de `src/components/dashboard/FinanzasTab.tsx` y `src/lib/cierreCaja.ts` → mapeo exhaustivo de cada métrica mostrada y de dónde sale cada número.
- `Grep "cajaSemana\\b|cajaMes\\b|..."` + `Read` de la sección de cálculo en `Dashboard.tsx` (líneas ~1357-1462) → confirmó semántica exacta de `cajaMes`/`cajaMesPasado` (mes calendario, no 30 días rodantes) y de `porMetodoMes`/`porTipoMes` (fijo al mes actual, redundante con la sección de "Comparación por Período").
- Presentó 6 hallazgos concretos al usuario (sin implementar): (1) "Días con cobro" no dice sobre qué período; (2) "Promedio/día con cobro" se puede confundir con promedio diario real; (3) "Trabajos" (creados) vs "Pagos" (cobros) no está explicado y pueden no coincidir; (4) la tarjeta de Mes no tiene la misma nota aclaratoria que ya tiene la de Semana; (5) la sección "Por método/tipo (mes)" es redundante con "Comparación por Período"; (6) "Por Cobrar (Total)"/"Devuelto por Garantías" no aclaran que son históricos, no del período elegido arriba.
- `AskUserQuestion` → el usuario confirmó aplicar los 6 puntos, y agregó un pedido extra: en la tarjeta de mes, mostrar el NOMBRE real del mes (ej. "Febrero" vs "Enero") en vez de "Este mes"/"Mes anterior".
- `Grep "pagadosMes|metodoMap|tipoMap|nombreMes|MESES\\b"` en `Dashboard.tsx` y `Grep "export function|MESES|nombreMes"` en `lib/date.ts` → confirmó que `pagadosMes`/`metodoMap`/`tipoMap` solo se usaban para la sección a eliminar (seguro borrarlos del todo) y que no existía ya un helper de nombre de mes.
- `Read` de `inicioMes`/`finMes`/`inicioMesPasado`/`finMesPasado` en `lib/fechaFinanzas.ts` → confirmó que ya había objetos `Date` disponibles (`mesIni`/`mesPasIni`) para derivar el nombre del mes con `toLocaleDateString('es-CL', { month: 'long' })`.
- Edit en `Dashboard.tsx` → quitó `pagadosMes`/`metodoMap`/`tipoMap`/`porMetodoMes`/`porTipoMes` por completo; agregó `nombreMesActual`/`nombreMesAnterior` (capitalizados) derivados de `mesIni`/`mesPasIni`; actualizó la desestructuración y el paso de props a `<FinanzasTab>`.
- Edit en `FinanzasTab.tsx` (`DesgloseFinanciero`) → "Días con cobro" ahora muestra "X de Y" (Y = `data.dias` en modo relativo, 7 en modo semana); "Trabajos"/"Pagos" con subtítulo aclaratorio; "Promedio/día con cobro" con nota aclaratoria.
- Edit en `FinanzasTab.tsx` (props + tarjeta "Mes Actual vs Anterior") → agregó `nombreMesActual`/`nombreMesAnterior` a la interfaz y los usó en vez de "Este mes"/"Mes anterior"; agregó la nota "Mes calendario completo (no últimos 30 días rodantes)" igual que ya tenía la tarjeta de semana.
- Edit en `FinanzasTab.tsx` → eliminó por completo la sección "💳 Por método de pago (mes)" / "🔧 Por tipo de trabajo (mes)"; agregó nota "Histórico completo, no depende del período elegido arriba" a "Por Cobrar (Total)" y "Devuelto por Garantías".
- `npx tsc --noEmit -p tsconfig.app.json` → limpio.
- `npm run build` → build exitoso (568ms).
- `npm run lint` → sin errores.
- (Usuario confirmó: "Sí, sube")
- `git add src/components/dashboard/Dashboard.tsx src/components/dashboard/FinanzasTab.tsx` → staging.
- `git commit -m "Aclara metricas confusas en Finanzas y quita seccion duplicada de metodo/tipo (mes)"` → commit `0979979`.
- `git push origin main` → `8c58315..0979979`.

### Archivos tocados (todos)
- `src/components/dashboard/Dashboard.tsx` — modificado — quitó el cálculo redundante de `porMetodoMes`/`porTipoMes`; agregó `nombreMesActual`/`nombreMesAnterior`.
- `src/components/dashboard/FinanzasTab.tsx` — modificado — 6 aclaraciones de texto/label, sección duplicada eliminada, nombres de mes reales en la tarjeta de comparación mensual.

### Hallazgos y decisiones
- Ninguno de los 6 hallazgos era un bug de cálculo — todos los números ya eran correctos, el problema era 100% de comunicación/labels poco claros. No se tocó ninguna fórmula financiera.
- Se eliminó la sección "Por método/tipo (mes)" completa en vez de solo ocultarla, junto con todo su cálculo en `Dashboard.tsx` (`pagadosMes`/`metodoMap`/`tipoMap`) — sin dejar código muerto, ya que no se usaban en ningún otro lado.
- El nombre del mes se deriva con `toLocaleDateString('es-CL', { month: 'long' })` + capitalización manual (JS no capitaliza por defecto en esa locale) — no se agregó ninguna librería nueva ni un array de nombres de meses hardcodeado.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: commit `0979979` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---
