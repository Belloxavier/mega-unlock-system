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

---
## [2026-08-25 03:00] Auditoría y limpieza de la pestaña Estadísticas + nueva sección Modelos Más Frecuentes

### Instrucción recibida
El usuario pidió revisar toda la pestaña Estadísticas ("debe darme lo que su nombre dice, viendo mi trabajo, qué es lo que realmente necesito ver"), analizar y mejorar todo, y decir qué hacer antes de aplicar. Después de la propuesta, también preguntó qué más se podría agregar que fuera realmente útil.

### Comandos ejecutados (todos, en orden)
- `Read` completo de `src/components/dashboard/EstadisticasTab.tsx` y `src/lib/estadisticasOperativas.ts` → mapeo de las 9 secciones de la pestaña y de dónde sale cada dato.
- Encontró un comentario en el código que admitía explícitamente que los bloques "Semana/Mes Actual vs Anterior" mezclaban dinero "a pedido explícito" (de una sesión anterior), rompiendo la regla declarada del propio módulo ("estadísticas operativas: nunca montos").
- Presentó 4 hallazgos al usuario (sin implementar): (1) redundancia real de dinero entre Estadísticas y Finanzas en los bloques Semana/Mes; (2) "Tipos de Trabajo Más Frecuentes" cortaba en el top 8 sin forma de ver el resto (mismo problema ya resuelto en Clientes); (3) "Mejor día histórico" era una curiosidad de bajo valor, redundante con "Comparación por Período" en modo 365d; (4) "Pendientes al cierre" es una reconstrucción aproximada no declarada como tal en pantalla.
- `AskUserQuestion` → el usuario confirmó aplicar los 4 puntos.
- `Grep "ganancia\\("` en `estadisticasOperativas.ts` → confirmó que `ganancia()` seguía siendo necesaria (usada en `calcularHistorialDia`, que SÍ se mantiene con dinero por ser un drill-down puntual, no una comparación duplicada).
- Edit en `estadisticasOperativas.ts` → `desglosePorDia`/`DiaDesglosado` perdieron el campo `ingresos` (ya no se necesita fuera de `calcularHistorialDia`); `DetallePeriodoComparado` perdió `ingresos`/`mejorDiaPorIngresos`; `calcularDetallePeriodo` simplificado; se eliminó `calcularMejorDiaHistorico` y la interfaz `MejorDia` (sin otros usos); `calcularPorTipoTrabajo` perdió el tope `maxItems = 8` (ahora devuelve todo, la vista decide cuánto mostrar); comentario de cabecera del archivo actualizado para reflejar la nueva regla sin excepciones.
- Edit en `EstadisticasTab.tsx` → quitó el import/uso de `calcularMejorDiaHistorico` y su tarjeta; `BloqueComparacion` simplificado (sin ingresos, sin "Mejor día (ingresos)", sin prop `fmt` ya innecesaria); nuevo estado `verTodosTipo` + botón "Ver todos" en Tipos de Trabajo; nota aclaratoria agregada bajo "Pendientes al cierre"; función `formatearFechaLegible` eliminada (sin otros usos tras quitar Mejor día histórico).
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios (primera verificación, antes de la sección nueva).
- (Usuario preguntó, en medio del trabajo: "¿qué otra cosa puedes agregar en estadísticas que sea realmente útil?")
- Se dio la opinión: ranking "Modelos más frecuentes" (mismo patrón que Tipos de Trabajo, por `modelo_normalizado`, ayuda a anticipar repuestos) como recomendación principal, con tasa de "No realizado" como alternativa secundaria.
- `AskUserQuestion` → el usuario eligió: agregar solo Modelos más frecuentes.
- Edit en `estadisticasOperativas.ts` → nueva función `calcularPorModelo(servicios)`, agrupa por `modelo_normalizado` (mismo criterio que el ranking de clientes agrupa por `nombre_normalizado`), muestra el primer `modelo_equipo` original visto para esa clave.
- Edit en `EstadisticasTab.tsx` → import de `calcularPorModelo`; nuevo estado `verTodosModelo`; nueva sección "📱 Modelos Más Frecuentes (Histórico)" (mismo patrón visual que Tipos de Trabajo, con su propio "Ver todos"), insertada entre esa sección y "📈 Volumen por Período".
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios (segunda verificación, con la sección nueva).
- (Usuario confirmó: "Sí, sube")
- `git add src/lib/estadisticasOperativas.ts src/components/dashboard/EstadisticasTab.tsx` → staging.
- `git commit -m "Limpia Estadisticas: quita dinero duplicado con Finanzas, Ver todos en rankings, agrega Modelos mas frecuentes"` → commit `5b00454`.
- `git push origin main` → `c5ee24f..5b00454`.

### Archivos tocados (todos)
- `src/lib/estadisticasOperativas.ts` — modificado — quitó dinero de `DetallePeriodoComparado`/`desglosePorDia`; eliminó `calcularMejorDiaHistorico`/`MejorDia`; `calcularPorTipoTrabajo` sin tope; nueva `calcularPorModelo`.
- `src/components/dashboard/EstadisticasTab.tsx` — modificado — `BloqueComparacion` sin dinero; tarjeta "Mejor día histórico" eliminada; "Ver todos" en Tipos de Trabajo; nota en Pendientes al cierre; nueva sección "Modelos Más Frecuentes" con su propio "Ver todos"; función `formatearFechaLegible` eliminada (sin uso).

### Hallazgos y decisiones
- La redundancia de dinero entre Estadísticas y Finanzas no era un accidente — el propio código admitía en un comentario que fue una decisión deliberada de una sesión anterior ("a pedido explícito"), que el usuario actual, sin saberlo, terminó pidiendo revertir. Vale la pena tenerlo presente: decisiones de diseño previas documentadas en comentarios pueden quedar obsoletas cuando cambian las prioridades del usuario.
- `calcularHistorialDia` (el drill-down de un día específico) SÍ mantiene ingresos — no es una comparación repetida como los bloques Semana/Mes, es la única forma de ver el detalle de un día puntual, así que ahí el dinero sigue teniendo sentido y no se tocó.
- "Modelos más frecuentes" se agrupa por `modelo_normalizado` (no por el texto crudo `modelo_equipo`) para que variantes de escritura del mismo modelo (ej. "iPhone 12" / "iphone 12" / "Iphone 12 ") cuenten como uno solo — mismo criterio ya usado para el modelo_normalizado en precio sugerido (sesión anterior).

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores (verificado dos veces, antes y después de agregar Modelos Más Frecuentes).
- Git: commit `5b00454` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---

---
## [2026-08-25 03:30] Estadísticas: nombre de mes y rango de fechas en Semana/Mes Actual vs Anterior

### Instrucción recibida
El usuario notó que, tras la limpieza de Estadísticas, "Mes Actual vs. Anterior" y "Semana Actual vs. Anterior" seguían mostrando "Actual"/"Anterior" genérico, sin el nombre del mes ni el rango de fechas de la semana — a diferencia de Finanzas, donde ya se había aplicado ese fix.

### Comandos ejecutados (todos, en orden)
- `Read` de `calcularDetallePeriodo`/`ComparacionSemanaMes` en `estadisticasOperativas.ts` → confirmó que `DetallePeriodoComparado` no traía fechas de inicio/fin, solo los totales — por eso `BloqueComparacion` no tenía de dónde sacar el mes o el rango.
- Edit en `estadisticasOperativas.ts` → agregó `fechaInicio`/`fechaFin` a `DetallePeriodoComparado` y a lo que devuelve `calcularDetallePeriodo` (usa `ini`/`fin`, que ya se calculaban, solo faltaba exponerlos).
- Edit en `EstadisticasTab.tsx` → nuevo helper `nombreMes(fechaStr)` (capitaliza `toLocaleDateString('es-CL', {month:'long'})`, mismo patrón que ya se usó en Finanzas/Dashboard.tsx); `BloqueComparacion` ganó una prop `esSemana` para decidir si la etiqueta de cada columna es un rango de fechas ("18/08 – 24/08") o un nombre de mes ("Agosto"), reemplazando los textos fijos "Actual"/"Anterior".
- Actualizó los 2 call sites (`esSemana` / `esSemana={false}`).
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios.
- (Usuario confirmó: "Sí, sube")
- `git add src/lib/estadisticasOperativas.ts src/components/dashboard/EstadisticasTab.tsx` → staging.
- `git commit -m "Estadisticas: muestra nombre de mes y rango de fechas de semana en las comparaciones, igual que Finanzas"` → commit `e91b000`.
- `git push origin main` → `5aba393..e91b000`.

### Archivos tocados (todos)
- `src/lib/estadisticasOperativas.ts` — modificado — `DetallePeriodoComparado` y `calcularDetallePeriodo` ahora exponen `fechaInicio`/`fechaFin`.
- `src/components/dashboard/EstadisticasTab.tsx` — modificado — nuevo helper `nombreMes`; `BloqueComparacion` con prop `esSemana` y etiquetas de columna reales en vez de "Actual"/"Anterior".

### Hallazgos y decisiones
- Se replicó exactamente el mismo criterio ya aplicado en Finanzas (mismo nombre de función conceptualmente, mismo patrón de capitalización) para no introducir un segundo enfoque distinto para el mismo problema.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: commit `e91b000` en `main`, pusheado a `origin/main`. Working tree limpio (pendiente de agregar esta entrada del registro).
---

---
## [2026-09-10 00:00] Garantía automática de 3 meses por equipo entregado

### Instrucción recibida
El usuario pidió (spec detallada, 5 puntos): (1) columna `garantia_vence_at` en `servicios` = `entregado_at + 3 meses`, null si no entregado; (2) backfill retroactivo sobre TODOS los registros ya entregados, sin excepción por fecha; (3) cálculo automático de ahí en adelante, sin acción manual; (4) badge visual 🟢/🔴 en Historial y Área de Trabajo, al lado de cada equipo (no correo, no banner agregado — es información de consulta, no toca la tabla `garantias` que es para reclamos); (5) seguir el workflow de siempre (local primero, avisar qué migración se necesita, no aplicar a producción sin visto bueno explícito), y registrar en PROGRESS_LOG.md.

Entre medio, también pidió (fuera de esta tarea) un resumen técnico completo del proyecto para pasarle a otra IA — se entregó como texto en el chat, sin tocar archivos, así que no generó una entrada propia en este registro.

### Comandos ejecutados (todos, en orden)
- `Read` de `HistorialServicios.tsx` completo (post cambios de sesiones anteriores: MenuImprimir, etc.) para ubicar dónde insertar el badge en tarjeta móvil y tabla de escritorio.
- `Write supabase/migrations/0024_garantia_vence_at.sql` → `alter table` (columna nueva), `update` de backfill (todos los `entregado_at is not null and garantia_vence_at is null`), función `calcular_garantia_vence_at()` + trigger `trg_garantia_vence_at` (`before insert or update of entregado_at`) que recalcula automáticamente — si `entregado_at` se limpia (ej. "Reactivar" un trabajo), `garantia_vence_at` también se limpia.
- Edit en `src/types.ts` → agregó `garantia_vence_at?: string | null` a la interfaz `Servicio`.
- `Write src/lib/garantia.ts` → nueva función `calcularEstadoGarantia(garantiaVenceAt)`, devuelve `null` si no hay fecha (equipo no entregado) o `{ vigente, diasRestantes }`.
- `Write src/components/dashboard/components/BadgeGarantia.tsx` → nuevo componente, renderiza 🟢 "Garantía: X días" o 🔴 "Sin garantía", o nada si `calcularEstadoGarantia` devuelve null.
- Edit en `HistorialServicios.tsx` (import + tarjeta móvil + tabla de escritorio) → `<BadgeGarantia garantiaVenceAt={s.garantia_vence_at} />` junto al nombre del modelo en ambos layouts.
- `Read` de `AreaTrabajoTab.tsx` (primeras 100 líneas, `TrabajoCard`) → confirmó estructura antes de tocar.
- Edit en `AreaTrabajoTab.tsx` (import + `TrabajoCard`) → mismo badge, junto a tipo de trabajo/nota.
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios.
- Presentó el resumen de la migración necesaria y preguntó cómo seguir (usuario: "Aplícala ahora").
- `AskUserQuestion` → se pidió un access token de la Management API de Supabase (mismo procedimiento que sesiones anteriores); el usuario lo pegó directamente en el chat.
- `Write` del payload JSON a `migracion_0024.json` en el scratchpad (mismo patrón que evitó la corrupción de encoding UTF-8 de una sesión anterior, aunque esta migración en particular no tenía caracteres fuera de ASCII en el SQL ejecutable, solo en comentarios).
- `curl --data-binary @migracion_0024.json` contra la Management API → `[]` (sin error).
- `curl` de verificación (3 consultas): conteo de entregados vs. con garantía calculada (756/756, 0 inconsistencias), estado del trigger (`tgenabled: 'O'` = activo), muestra de 3 filas confirmando `garantia_vence_at = entregado_at + 3 meses` exacto.
- (Usuario: "Espera, quiero probarlo en la app primero" — código NO subido a GitHub todavía)

### Archivos tocados (todos)
- `supabase/migrations/0024_garantia_vence_at.sql` — nuevo — **aplicado en producción**, verificado.
- `src/types.ts` — modificado — nuevo campo `garantia_vence_at` en `Servicio`.
- `src/lib/garantia.ts` — nuevo — cálculo de vigencia/días restantes.
- `src/components/dashboard/components/BadgeGarantia.tsx` — nuevo — el badge visual.
- `src/components/dashboard/components/HistorialServicios.tsx` — modificado — badge en tarjeta móvil y tabla de escritorio.
- `src/components/dashboard/AreaTrabajoTab.tsx` — modificado — badge en `TrabajoCard`.

### Hallazgos y decisiones
- El cálculo automático se implementó como **trigger de base de datos**, no como lógica en el código de React — así funciona sin importar desde dónde se actualice `entregado_at` (Dashboard.tsx hoy, cualquier función futura, o incluso una corrección manual por SQL), sin tener que acordarse de duplicar la fórmula en cada lugar que toque esa columna.
- El trigger también LIMPIA `garantia_vence_at` a null si `entregado_at` vuelve a null (ej. al usar "Reactivar" sobre un trabajo marcado como entregado por error) — evita que quede una fecha de garantía fantasma sobre un trabajo que ya no está entregado.
- El backfill fue un `UPDATE` directo (no depende del trigger, que solo dispara con cambios de `entregado_at`) — necesario porque los registros ya existentes no iban a "cambiar" esa columna al aplicar la migración.
- El badge deliberadamente NO se agregó como un banner agregado tipo `AlertasFiados`/`AlertasAtascados` — el usuario pidió explícitamente que fuera información al lado de cada equipo individual, no un listado aparte; se reutilizó el estilo visual de badge/pill compacto (`px-2 py-1 rounded-full border`, mismo patrón que otros badges de estado ya existentes en la app), no la estructura de esos banners.
- No se tocó la tabla `garantias` en ningún punto — es un concepto completamente separado (reclamos post-entrega), tal como pidió el usuario.
- Migración aplicada directamente a producción con confirmación explícita del usuario ("Aplícala ahora"), verificada con 3 consultas antes de dar por buena. El código (React) queda sin subir a GitHub a pedido del usuario, hasta que lo pruebe visualmente en la app.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: **sin commitear** — cambios locales pendientes (`supabase/migrations/0024_garantia_vence_at.sql`, `src/types.ts`, `src/lib/garantia.ts`, `src/components/dashboard/components/BadgeGarantia.tsx`, `src/components/dashboard/components/HistorialServicios.tsx`, `src/components/dashboard/AreaTrabajoTab.tsx`). Usuario pidió esperar a probarlo antes de subir.
- Supabase: migración `0024` **aplicada y verificada en producción** (backfill 756/756 correcto, trigger activo).
---

---
## [2026-09-10 00:30] Rediseño: badge de garantía sale de Historial/Área de Trabajo, nueva sub-pestaña "Cobertura" en Garantías

### Instrucción recibida
El usuario probó el badge de garantía en el dev local y mandó una captura: se veía saturado visualmente en la tabla de Historial (badges empujando el texto del modelo, filas desalineadas). Pidió: (1) quitar el badge de `HistorialServicios.tsx` y `AreaTrabajoTab.tsx`, dejarlos como estaban antes de esa entrada; (2) rediseñar `GarantiasTab.tsx` en dos sub-pestañas: "Reclamos" (la tabla que ya existía, sin tocar su lógica) y "Cobertura" (nueva) — un buscador por cliente, reutilizando el mismo mecanismo que ya usa Clientes, mostrando los equipos ENTREGADO de ese cliente con el badge de garantía.

### Comandos ejecutados (todos, en orden)
- Análisis de la captura enviada por el usuario → confirmó el problema (badge ocupando demasiado espacio junto al nombre del modelo, filas desalineadas en la tabla de escritorio).
- Edit en `HistorialServicios.tsx` (import + tarjeta móvil + tabla de escritorio) → revertido el `<BadgeGarantia>`, vuelve exactamente al estado anterior.
- Edit en `AreaTrabajoTab.tsx` (import + `TrabajoCard`) → mismo revert.
- `Grep "GarantiasTab|resultadosBusquedaCliente|busquedaClienteHistorial"` en `Dashboard.tsx` → ubicó el memo de búsqueda por cliente de Clientes y el punto de render de `GarantiasTab`.
- `Read` de ese memo (`resultadosBusquedaCliente`, ~25 líneas) → confirmó la lógica exacta a reutilizar (agrupar por `nombre_normalizado`, mostrar nombre original, ordenar por cantidad de trabajos).
- `Read` completo de `GarantiasTab.tsx` (antes de tocarlo) → confirmó la estructura de "Reclamos" (formulario + ranking + historial) que no debía modificarse.
- Edit en `Dashboard.tsx` → nueva función a nivel de módulo `agruparPorClienteCoincidente(servicios, texto)` (extraída del cuerpo de `resultadosBusquedaCliente` para no duplicar la lógica); `resultadosBusquedaCliente` refactorizado para llamarla; nuevo estado `busquedaCobertura`; nuevo memo `resultadosCobertura` (mismo agrupador, pero sobre `servicios.filter(s => s.estado === 'ENTREGADO')` en vez de la tabla completa); nuevas props pasadas a `<GarantiasTab>`.
- Edit en `GarantiasTab.tsx` → renombró el contenido existente a un componente interno `GarantiasReclamos` (mismo JSX, sin cambios de lógica); nuevo componente `GarantiasCobertura` (buscador + resultados agrupados por cliente, cada equipo con `<BadgeGarantia>` y su fecha de entrega); nuevo `export function GarantiasTab` como wrapper con toggle de sub-pestañas (`🛠️ Reclamos` / `🛡️ Cobertura`), estado local `vista`.
- `npx tsc --noEmit -p tsconfig.app.json` → limpio.
- `npm run build` → build exitoso (376ms).
- `npm run lint` → sin errores.
- (Usuario: "Espera a que lo pruebe" — código sigue sin subir a GitHub)

### Archivos tocados (todos)
- `src/components/dashboard/components/HistorialServicios.tsx` — modificado — revertido a como estaba antes del badge de garantía.
- `src/components/dashboard/AreaTrabajoTab.tsx` — modificado — mismo revert.
- `src/components/dashboard/Dashboard.tsx` — modificado — nueva función `agruparPorClienteCoincidente` (reutilizada por Clientes y Garantías→Cobertura), nuevo estado/memo `busquedaCobertura`/`resultadosCobertura`, nuevas props hacia `GarantiasTab`.
- `src/components/dashboard/GarantiasTab.tsx` — modificado — reestructurado en sub-pestañas: `GarantiasReclamos` (contenido original sin cambios), `GarantiasCobertura` (nuevo), `GarantiasTab` (wrapper con toggle).

### Hallazgos y decisiones
- Se extrajo la lógica de agrupación por cliente a una función compartida (`agruparPorClienteCoincidente`) en vez de copiar y pegar el mismo bloque para Cobertura — exactamente lo que pidió el usuario ("reutiliza el mismo mecanismo de búsqueda"), y evita que un futuro cambio en cómo se agrupa/ordena tenga que replicarse en dos lugares.
- "Cobertura" filtra a `estado === 'ENTREGADO'` ANTES de agrupar (no después) — así un cliente con equipos en otros estados no aparece en absoluto en esa búsqueda si no tiene ningún entregado, y el conteo mostrado ("N equipos") ya refleja solo los que tienen garantía calculada.
- El badge de garantía (`BadgeGarantia`, creado en la entrada anterior) no se tocó — solo cambió DÓNDE se usa: antes en cada fila de Historial/Área de Trabajo (saturado visualmente), ahora solo dentro de la búsqueda dedicada de Cobertura, donde hay más espacio y contexto.
- La tabla de "Reclamos" (formulario + ranking + historial de garantías) no tuvo ningún cambio de lógica, solo se movió a un componente interno separado para poder envolverla en el toggle de sub-pestañas.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: **sin commitear** — todo lo de esta entrada más lo pendiente de la entrada anterior (migración `0024` ya aplicada en producción, código local sin subir). Usuario pidió esperar a probarlo.
- Supabase: sin cambios en esta entrada (la migración `0024` ya estaba aplicada desde antes).
---

---
## [2026-09-10 00:45] Texto del badge de garantía: aclara vigente/vencida con fecha exacta

### Instrucción recibida
El usuario notó que "Garantía: X días" era ambiguo (no quedaba claro si eran los días restantes o los transcurridos). Pidió: (1) cambiar a "Vence en X días" cuando está vigente; (2) agregar la fecha exacta de vencimiento junto al texto, ej. "Vence en 83 días (02 dic 2026)"; (3) para vencidas, "Sin garantía (venció el DD mmm)" con la fecha exacta en que se cumplieron los 3 meses.

### Comandos ejecutados (todos, en orden)
- `Grep "export function|toLocaleDateString"` en `lib/date.ts` → sin resultados (los helpers ahí son `export const`, no `export function`); `Grep "^export"` → confirmó que no existía un formateador "DD mmm YYYY" ya hecho, solo `getFechaCorta` (formato "lunes DD/MM").
- `Read` completo de `lib/date.ts` → confirmó `ZONA_HORARIA` exportado, reutilizable para formatear en hora de Chile (mismo criterio que el resto de la app) en vez de la zona horaria del navegador.
- Edit en `lib/garantia.ts` → `EstadoGarantia` ganó el campo `fechaFormateada` (`toLocaleDateString('es-CL', { timeZone: ZONA_HORARIA, day:'2-digit', month:'short', year:'numeric' })`, ej. "02 dic 2026"); `calcularEstadoGarantia` la calcula y devuelve.
- Edit en `BadgeGarantia.tsx` → texto vigente cambiado a "🟢 Vence en X días (fecha)"; texto vencida cambiado a "🔴 Sin garantía (venció el fecha)".
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios.
- (Usuario: "Espera a que lo pruebe" — código sigue sin subir a GitHub)

### Archivos tocados (todos)
- `src/lib/garantia.ts` — modificado — nuevo campo `fechaFormateada` en `EstadoGarantia`.
- `src/components/dashboard/components/BadgeGarantia.tsx` — modificado — texto de ambos estados (vigente/vencida) con la fecha exacta.

### Hallazgos y decisiones
- La fecha se formatea explícitamente en la zona horaria de Chile (`America/Santiago`), no en la del navegador — mismo criterio que el resto del proyecto (`getFechaLocal`, etc.), para que no varíe según dónde esté físicamente quien mira la pantalla.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: **sin commitear** — se suma a lo pendiente de las 2 entradas anteriores (migración `0024` aplicada en producción, código local sin subir). Usuario pidió esperar a probarlo.
- Supabase: sin cambios en esta entrada.
---

---
## [2026-09-10 01:00] Cobertura: de buscador-vacío-por-defecto a lista completa paginada

### Instrucción recibida
El usuario pidió no dejar "Cobertura" vacía hasta escribir un nombre. En dos mensajes: (1) por defecto mostrar TODOS los equipos ENTREGADO con su garantía; selector de orden "Más reciente"/"Más antiguo" por fecha de entrega; filas "Sin garantía" en rojo/alerta visualmente distinguidas (no solo texto); el buscador filtra esta misma lista en vez de ser la única forma de ver algo; con 779 entregados, cuidar el rendimiento con paginación/límite. (2) Aclaración: al buscar por cliente, mostrar TODOS sus equipos entregados (vigentes Y vencidos), no ocultar los que perdieron la garantía.

### Comandos ejecutados (todos, en orden)
- `Read` de la sección de `Dashboard.tsx` donde vivía `resultadosCobertura` (agrupado por cliente, versión anterior) para planear el reemplazo.
- Edit en `Dashboard.tsx` → reemplazó `resultadosCobertura` (agrupado, requería búsqueda) por `equiposCobertura`: lista PLANA de `Servicio[]` filtrada a `estado === 'ENTREGADO'`, opcionalmente acotada por nombre/teléfono si hay búsqueda (sin excluir vencidos), ordenada por `entregado_at` según `ordenCobertura`; nuevo estado `ordenCobertura` (`'reciente' | 'antiguo'`, default `'reciente'`); wiring actualizado hacia `GarantiasTab` (`equiposCobertura`/`ordenCobertura`/`onOrdenCobertura` en vez de `resultadosCobertura`).
- Edit en `GarantiasTab.tsx` → `Props` actualizado (mismo cambio de forma); `GarantiasCobertura` reescrito por completo: quitó el agrupado por cliente, ahora renderiza una lista plana de tarjetas-fila (una por equipo), cada una con `background`/`border` verde o rojo tenue según `calcularEstadoGarantia(...).vigente` (no solo el badge, la fila entera); agregó selector de orden (2 botones); agregó paginación local (`PAGE_SIZE_COBERTURA = 20`, estado `pagina`, `useEffect` que resetea a página 1 cuando cambia búsqueda u orden); mensaje vacío distingue "sin resultados de búsqueda" de "no hay equipos entregados todavía".
- `npx tsc --noEmit -p tsconfig.app.json` → limpio.
- `npm run build` → build exitoso (383ms).
- `npm run lint` → sin errores.
- (Usuario: "Espera a que lo pruebe" — código sigue sin subir a GitHub)

### Archivos tocados (todos)
- `src/components/dashboard/Dashboard.tsx` — modificado — `equiposCobertura` (lista plana) reemplaza `resultadosCobertura` (agrupada); nuevo estado `ordenCobertura`.
- `src/components/dashboard/GarantiasTab.tsx` — modificado — `GarantiasCobertura` reescrito: lista plana con color por fila, selector de orden, paginación local.

### Hallazgos y decisiones
- La paginación es puramente de VISTA (estado local en `GarantiasCobertura`, `useState` + slice del arreglo), no server-side — los 779 equipos entregados ya viven en memoria (misma tabla `servicios` que usa toda la app), así que no hace falta ninguna consulta nueva a Supabase; el "cuidado con el rendimiento" pedido es sobre cuántas filas se pintan en el DOM a la vez, no sobre cuántos datos se traen de la base.
- Al buscar por cliente, el filtro se aplica ANTES de decidir qué mostrar (no hay una rama separada "con búsqueda" vs "sin búsqueda" que oculte vencidos) — así se garantiza que el historial de garantía de un cliente buscado siempre esté completo, vigentes y vencidos, tal como pidió el usuario en su segundo mensaje.
- El color de fila (verde/rojo tenue en `background`+`border`) se calculó a partir del mismo `calcularEstadoGarantia` que ya usa `BadgeGarantia` — ninguna lógica de vigencia nueva, solo se le agregó una consecuencia visual a nivel de fila además del badge.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: **sin commitear** — se suma a lo pendiente de las 3 entradas anteriores (migración `0024` aplicada en producción, código local sin subir). Usuario pidió esperar a probarlo.
- Supabase: sin cambios en esta entrada.
---

---
## [2026-09-10 01:30] Bug real encontrado por el usuario: "sin dato" se mostraba como "vencido" en Cobertura

### Instrucción recibida
El usuario mandó una captura: dos equipos entregados con 1 día de diferencia (2026-07-29 y 2026-07-28) mostraban garantías incompatibles (uno "Vence en 49 días", el otro en rojo sin badge) — matemáticamente imposible con solo 1 día de diferencia real. Pidió: (1) contar cuántos `ENTREGADO` tienen `garantia_vence_at` null; (2) investigar por qué se cortó el backfill (¿límite de filas, rango de fechas, error silencioso?); (3) corregir el backfill para cubrir TODOS los históricos, y revisar que el componente no confunda "sin dato" con "vencido". Pidió confirmación de cuántos registros tenían el problema y que quedaran corregidos antes de subir nada.

### Comandos ejecutados (todos, en orden)
- `Grep "estado\?\.vigente|calcularEstadoGarantia"` en `GarantiasTab.tsx` → confirmó la sospecha del usuario: `estado?.vigente ? verde : rojo` colapsa `estado === null` (sin dato) y `estado.vigente === false` (vencida) en la misma rama roja.
- `AskUserQuestion` → se pidió el access token de la Management API (el usuario reutilizó el mismo de la sesión anterior).
- `curl` de diagnóstico (1 query con 4 `count(*) filter`) → **total ENTREGADO: 779, sin `entregado_at`: 24, con `entregado_at` pero sin `garantia_vence_at`: 0, con garantía: 755**. Confirmó que el backfill/trigger de la migración 0024 funcionó al 100% sobre cualquier fila que SÍ tuviera `entregado_at` — el hueco no es un backfill cortado, es que esas 24 filas nunca tuvieron `entregado_at` en absoluto.
- `curl` → trajo los 24 registros completos (folio, created_at, pagado_at, completado_at, entregado_at) → los 24 son del mismo día (2026-07-28), sin folio, con `pagado_at` idéntico a `created_at` — patrón de datos anteriores al sistema de folios (migración 0011) y a que `entregado_at` se guardara consistentemente.
- `curl` de confirmación (min/max created_at, conteo sin folio, conteo con pagado_at=created_at) → confirmó: los 24 caen exactamente en una sola fecha (2026-07-28 14:34 a 20:55), 24/24 sin folio, 24/24 con `pagado_at = created_at`.
- `Grep "handleCambiarEstado"` + `Read` de `aplicarCambioEstado` en `Dashboard.tsx` → confirmó que el código actual SIEMPRE setea `entregado_at` al pasar a ENTREGADO — el hueco no puede repetirse con uso normal de la app, es puramente histórico.
- Presentó el diagnóstico completo al usuario y preguntó cómo tratar los 24 (aproximar con `created_at` vs. dejarlos sin fecha con badge neutro).
- `AskUserQuestion` → el usuario eligió explícitamente NO inventar una fecha: dejar `entregado_at`/`garantia_vence_at` en null para esos 24, y mostrar un badge "Sin dato" distinto.
- Edit en `BadgeGarantia.tsx` → cuando `calcularEstadoGarantia` devuelve `null`, ahora renderiza "⚪ Sin dato" (antes retornaba `null`, invisible) — con comentario explicando que este componente solo se usa donde ya se filtró a ENTREGADO, así que null siempre significa "sin fecha registrada", nunca "no entregado todavía".
- Edit en `GarantiasTab.tsx` (`GarantiasCobertura`) → color de fila con 3 ramas (`!estado` → gris neutro, `estado.vigente` → verde, si no → rojo) en vez de la rama binaria que causaba el bug.
- Edit en `GarantiasTab.tsx` (misma fila, texto de fecha) → antes decía "entregado {fecha}" cayendo en `created_at` sin avisar cuando `entregado_at` era null; ahora distingue explícitamente: "entregado {fecha}" si hay dato real, o "creado {fecha} (sin fecha de entrega registrada)" si no.
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios.
- (Usuario: "Espera a que lo pruebe" — código sigue sin subir a GitHub)

### Archivos tocados (todos)
- `src/components/dashboard/components/BadgeGarantia.tsx` — modificado — nuevo estado visual "Sin dato" (gris) en vez de no renderizar nada.
- `src/components/dashboard/GarantiasTab.tsx` — modificado — color de fila de 3 ramas; texto de fecha honesto (no confunde `created_at` con `entregado_at`).

### Hallazgos y decisiones
- **No hubo ningún cambio en la base de datos en esta entrada** — a pedido explícito del usuario, se decidió NO fabricar una fecha de entrega para los 24 registros legacy, aunque `pagado_at` coincidiera exactamente con `created_at` y hubiera sido la aproximación más obvia. La corrección fue puramente de UI: mostrar honestamente "sin dato" en vez de inventar información o confundirla visualmente con "vencida".
- El bug reportado por el usuario era 100% real y se debía a un patrón común de JS (`x?.propiedad ? A : B` trata `undefined` igual que `false`) — ambos casos (sin dato / vencida) colapsaban a la misma rama visual pese a ser conceptos completamente distintos.
- Se descartó la hipótesis original del usuario ("el backfill se cortó") con evidencia directa: 0 filas con `entregado_at` real quedaron sin `garantia_vence_at`. Vale la pena que quede registrado que la sospecha inicial, aunque razonable, no era la causa — el diagnóstico con datos reales encontró algo distinto (y más simple de corregir sin tocar la base) de lo que se sospechaba al principio.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: **sin commitear** — se suma a lo pendiente de las 4 entradas anteriores (migración `0024` aplicada en producción, código local sin subir). Usuario pidió esperar a probarlo.
- Supabase: **sin cambios en esta entrada** — los 24 registros siguen con `garantia_vence_at = null`, a propósito, por decisión explícita del usuario.
---

---
## [2026-09-10 01:35] Garantías abre en Cobertura por defecto

### Instrucción recibida
El usuario pidió que la pestaña Garantías muestre "Cobertura" por defecto en vez de "Reclamos" al entrar.

### Comandos ejecutados (todos, en orden)
- `Grep "useState<'reclamos' \| 'cobertura'>\('reclamos'\)"` en `GarantiasTab.tsx` → ubicó el estado local `vista`.
- Edit en `GarantiasTab.tsx` → default cambiado de `'reclamos'` a `'cobertura'`.
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` → los tres limpios.
- (Usuario: "Espera a que lo pruebe" — código sigue sin subir a GitHub)

### Archivos tocados (todos)
- `src/components/dashboard/GarantiasTab.tsx` — modificado — una línea, default del toggle de sub-pestaña.

### Hallazgos y decisiones
- Cambio trivial, sin lógica nueva — se suma al resto de cambios de garantía automática ya acumulados sin subir.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso, `npm run lint` sin errores.
- Git: **sin commitear** — se suma a lo pendiente de las entradas anteriores. Usuario pidió esperar a probarlo.
- Supabase: sin cambios.
---

---
## [2026-09-22 00:43] Revisión inicial del proyecto por Cerebro

### Instrucción recibida
Revisar el proyecto y explicar su estado para dar continuidad al trabajo previo con Claude Code.
Las funciones nuevas se definirán después; esta ronda no cambia funcionalidades.

### Comandos ejecutados (todos, en orden)
- `Get-Location` → Raíz del proyecto confirmada.
- `git status --short` → Solo .claude/ sin seguimiento; advertencias de acceso al ignore global.
- `rg --files -g AGENTS.md -g package.json -g '*lock*' -g 'README*' -g 'PROGRESS_LOG.md' -g '*config*' -g '.env*' -g '!node_modules' -g '!dist'` → Inventario de configuración y documentación.
- `Get-Content AGENTS.md` → Instrucciones del proyecto leídas; visualización inicial con codificación incorrecta.
- `Get-Content package.json` → Scripts y dependencias revisados.
- `Get-Content README.md` → README todavía de plantilla.
- `rg --files src supabase` → Inventario de aplicación, funciones y 24 migraciones.
- `Get-Content PROGRESS_LOG.md -Tail 100` → Historial reciente de garantías revisado.
- `Get-Content 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md'` → Guía Supabase leída.
- `Get-Content -Encoding UTF8 src/App.tsx,src/types.ts,src/supabase.ts,src/hooks/useServicios.ts,src/hooks/useClientes.ts` → Autenticación, tipos y acceso a datos revisados.
- `Get-Content -Encoding UTF8 src/lib/estadisticasOperativas.ts,src/lib/precioSugerido.ts,src/lib/tiempo.ts` → Cálculos operativos y precios revisados.
- `Get-Content -Encoding UTF8 supabase/migrations/0012_endurece_rls.sql` → Políticas locales restringen acceso a usuarios autenticados.
- `rg -n 'useEffect|async |function |const handle|supabase|slice\(|range\(|limit\(' src/components/dashboard/Dashboard.tsx` → Mapa de efectos y operaciones.
- `git log -5 --oneline` → HEAD a3f4a9c: garantía automática y Cobertura.
- `rg --files -g '*test*' -g '*spec*' -g '!package-lock.json' -g '!node_modules' -g '!dist'` → Sin archivos de pruebas encontrados.
- `Get-ChildItem src -Recurse -File | Sort-Object Length -Descending | Select-Object -First 12 Name,Length` → Dashboard es el archivo fuente de mayor tamaño.
- `npm run build` → Falló por política de ejecución de npm.ps1; no llegó a compilar.
- `npm run lint` → Falló por política de ejecución de npm.ps1; no llegó a ejecutar oxlint.
- `Get-Content -Encoding UTF8 src/components/dashboard/Dashboard.tsx | Select-Object -Skip 200 -First 100` → Efectos, paginación y refresco revisados.
- `Get-Content -Encoding UTF8 src/components/dashboard/Dashboard.tsx | Select-Object -Skip 404 -First 202` → Registro y edición de servicios revisados.
- `Get-Content -Encoding UTF8 src/components/dashboard/Dashboard.tsx | Select-Object -Skip 712 -First 120` → Cambios de estado y WhatsApp revisados.
- `rg -n 'iniciado_at|finalizado_at|tiempo_real|tiempo_valido|aprendiendo|carga|siguiente|tecnico|rapido|rápido' src supabase` → Referencias de inteligencia y tiempos.
- `Get-Content -Encoding UTF8 supabase/migrations/0015_add_tiempo_real.sql,supabase/migrations/0016_add_tiempo_valido.sql,supabase/migrations/0024_garantia_vence_at.sql` → Columnas históricas de tiempo y trigger de garantía.
- `Get-Content -Encoding UTF8 .gitignore` → dist y node_modules excluidos.
- `npm.cmd run build` → Exit 0: tsc -b y Vite 8.1.5; 138 módulos, Vite 1.94 s.
- `npm.cmd run lint` → Exit 0: oxlint sin diagnósticos.
- `Get-Content -Encoding UTF8 src/lib/cierreCaja.ts,src/lib/fechaFinanzas.ts,src/lib/date.ts,src/lib/garantia.ts` → Revisión de cálculos; salida extensa parcialmente truncada.
- `Get-Content -Encoding UTF8 src/hooks/useGarantias.ts,src/hooks/useCierresCaja.ts,src/hooks/useCuentasBancarias.ts` → Hooks de datos incluidos en lectura.
- `rg -n 'inicio_real|fin_real|tiempo|elimin|quit|inteligente' PROGRESS_LOG.md` → Historial de decisiones sobre tiempos.
- `rg -n 'Deno.env|authorization|cron|select\(|range\(|limit\(|fetch\(' supabase/functions/*/index.ts` → Falló: glob de ruta no aceptado en Windows; luego repetido con -g.
- `Get-Content -Encoding UTF8 src/components/Login.tsx,src/components/PagoPublico.tsx` → Login y página de datos bancarios.
- `Get-Content -Encoding UTF8 supabase/migrations/0020_proteger_cron_edge_functions.sql` → Protección con secreto de cron documentada.
- `rg -n 'inicio_real|fin_real|cronomet|cronómet|inteligente|tiempo real|eliminar.*tiempo|quitar.*tiempo' PROGRESS_LOG.md src supabase` → Confirmada eliminación histórica del tracking.
- `rg -n 'Deno.env|authorization|Cron|select\(|range\(|limit\(|fetch\(' supabase/functions -g index.ts` → Funciones usan secreto y variables de entorno; consultas identificadas.
- `Get-Content -Encoding UTF8 src/hooks/useGarantias.ts,src/hooks/useCierresCaja.ts,src/hooks/useCuentasBancarias.ts` → Garantías sin paginar; cierres limitados a 60.
- `Get-Content -Encoding UTF8 src/lib/date.ts` → Zona Chile explícita y limitación DST documentada.
- `rg -n 'channel\(|postgres_changes|visibilitychange|focus' src` → Coincidencias focus mayormente CSS, sin sincronización Realtime.
- `(Get-Content src/components/dashboard/Dashboard.tsx).Count` → 2211 líneas.
- `git status --short` → Solo .claude/ sin seguimiento antes del registro; build no modificó fuentes.
- `Get-Date -Format 'yyyy-MM-dd HH:mm'` → 2026-09-22 00:43, hora local.
- `Get-ChildItem dist -Recurse -File | Select-Object -ExpandProperty FullName` → Inventario de nueve artefactos generados.
- `Get-ChildItem node_modules/.tmp -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name` → Dos cachés tsbuildinfo.
- `Get-Content -Encoding UTF8 PROGRESS_LOG.md -First 85` → Commit 5386d1d documenta retiro de tiempos y dificultad.
- `Get-Content -Encoding UTF8 supabase/functions/weekly-report/index.ts | Select-Object -Skip 130 -First 85` → Consultas y cálculo del reporte semanal; salida conjunta parcialmente truncada.
- `Get-Content -Encoding UTF8 src/components/dashboard/AreaTrabajoTab.tsx -First 125` → Tarjetas y agrupación de trabajos.
- `rg -n '1000|maximum|max_rows' node_modules/@supabase/supabase-js/src/SupabaseClient.ts` → Sin coincidencias.
- `Get-Content -Encoding UTF8 tsconfig.app.json,tsconfig.node.json,vite.config.ts` → Build verifica src y configuración Vite; no Edge Functions. strict no activado.
- `rg -n 'create table|enable row level|create policy' supabase/migrations` → Inventario de políticas; esquema inicial clientes/servicios no está en migraciones.
- `rg -n 'channel\(|postgres_changes|visibilitychange|addEventListener\(.focus' src` → Sin coincidencias, exit 1 esperado.
- Herramienta web (sin shell): consulta de documentación oficial de select de Supabase y límite de filas → límite predeterminado de 1000 confirmado en documentación; configuración real del proyecto no consultada.
- Herramienta apply_patch (sin shell), primer intento → no aplicó por contexto no coincidente; sin cambios.
- Herramienta apply_patch (sin shell), segundo intento → append de esta entrada a PROGRESS_LOG.md.
Las comprobaciones build/lint/lectura se lanzaron en paralelo; se listan en orden de lanzamiento.

### Archivos tocados (todos)
- `PROGRESS_LOG.md` — modificado — añade revisión, comprobaciones, hallazgos y límites de la auditoría.
- `dist/favicon.svg` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `dist/icons.svg` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `dist/index.html` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `dist/manifest.json` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `dist/assets/index-CH42tBQ0.css` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `dist/assets/index-Ci3FQ1X8.js` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `dist/assets/rolldown-runtime-DAXXjFlN.js` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `dist/assets/src-BHyPwket.js` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `dist/assets/vendor-LbrMf0co.js` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `node_modules/.tmp/tsconfig.app.tsbuildinfo` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.
- `node_modules/.tmp/tsconfig.node.tsbuildinfo` — creado / modificado — artefacto regenerado por build, ignorado por Git; no se inventarió su existencia anterior.

### Hallazgos y decisiones
- Base React + TypeScript + Vite + Supabase con servicios, clientes, garantías, cobertura, caja, estadísticas, OCR IMEI, impresión, WhatsApp y funciones programadas. Hay separación en componentes/hooks/lib, normalización de modelos/clientes, folios atómicos y manejo explícito de errores en varias rutas.
- Prioridad: fetchServicios en src/hooks/useServicios.ts hace un solo select sin recorrer páginas y se usa como historial completo para cálculos y búsquedas. Si supera el máximo configurado en API faltarán registros antiguos en memoria; no se verificó el volumen ni límite del servidor. El listado paginado puede mostrar filas ausentes de ese arreglo y handleCambiarEstado las busca precisamente en servicios.
- Dashboard.tsx concentra 2211 líneas y operaciones de dominios distintos; separar gradualmente al tocar cada módulo reduce riesgo.
- No se encontró sincronización entre sesiones por Realtime, foco o polling de datos; cada dispositivo refresca al cargar o tras sus propias operaciones. El intervalo de un minuto recalcula reloj, no descarga datos.
- No hay script test ni archivos de pruebas encontrados. Build y lint no garantizan corrección de pagos, fechas, garantías o flujos reales; tampoco validan las Edge Functions con Deno.
- El tracking inicio_real/fin_real y dificultad se retiró previamente según PROGRESS_LOG y commit 5386d1d. AGENTS.md mantiene esa visión, pero no es descripción de la implementación actual. No restaurar sin pedido. Precio sugerido sí existe y agrupa montos positivos por modelo/servicio, incluso trabajos no cobrados o no realizados.
- Crear/editar cliente y guardar servicio son operaciones separadas: un fallo posterior puede dejar el cambio del cliente aplicado. buscarClientePorNombreExacto devuelve null tanto por ausencia como por error, y el llamador puede intentar crear un cliente tras una búsqueda fallida.
- README sigue siendo plantilla y falta esquema inicial de clientes/servicios en las migraciones, por lo que el repositorio solo no reproduce toda la base desde cero.
- Políticas locales permiten acceso amplio a usuarios autenticados; no se validó configuración remota de registro, usuarios autorizados ni aplicación de migraciones. No se afirma una vulnerabilidad remota confirmada.
- Se revisaron fuentes y documentación; no se abrió una sesión de usuario ni se probaron pantallas en navegador, no se consultaron datos de producción, no se ejecutaron crons ni se enviaron mensajes.
- Git previo: HEAD a3f4a9c incluye garantías automáticas; las notas antiguas de cambios sin subir no describen el estado local actual. .claude/ ya estaba sin seguimiento y se dejó intacto.
- No se modificaron funciones, dependencias, base de datos ni configuración. No commit ni push.

### Estado final
- Tests/build: npm.cmd run build exit 0 (tsc -b + Vite; 138 módulos); npm.cmd run lint exit 0 sin diagnósticos. No suite automatizada disponible. Primeros intentos con npm fallaron por npm.ps1; npm.cmd resolvió sin cambiar la política del sistema.
- Git: sin staged ni commit en esta ronda; PROGRESS_LOG.md modificado por esta entrada y .claude/ previamente sin seguimiento. Artefactos de build ignorados.
---

---
## [2026-09-22 00:49] Diagnóstico de correos automáticos ausentes

### Instrucción recibida
El usuario confirma que pidió retirar los tiempos reales porque agregaban trabajo y olvidaba finalizarlos.
Solicita investigar por qué dejó de ver los correos con estadísticas.

### Comandos ejecutados (todos, en orden)
- `Get-Content -Encoding UTF8 supabase/functions/weekly-report/index.ts` → revisada generación y envío SMTP; consulta falla antes de enviar.
- `Get-Content -Encoding UTF8 supabase/functions/weekly-report/README.md` → programación y secretos documentados.
- `Get-Content -Encoding UTF8 supabase/functions/alertas-pendientes/README.md` → envío diario a las 22h Chile, condicionado a pendientes.
- `Get-Content -Encoding UTF8 supabase/migrations/0002_schedule_weekly_report.sql,supabase/migrations/0020_proteger_cron_edge_functions.sql` → programación semanal y protección compartida.
- `rg -n 'correo|weekly|CRON|secreto|gmail|reporte semanal' PROGRESS_LOG.md` → no evidencia histórica suficiente del fallo actual.
- `Get-Command supabase -ErrorAction SilentlyContinue | Select-Object Name,Source` → sin CLI disponible en PATH.
- `Get-ChildItem Env: | Where-Object Name -Match 'SUPABASE|DATABASE|PGHOST|PGUSER' | Select-Object -ExpandProperty Name` → sin variables coincidentes; no se imprimieron secretos.
- `git log --oneline --all -- supabase/functions supabase/migrations/0020_proteger_cron_edge_functions.sql` → historial de siete commits de funciones.
- `Get-Content -Encoding UTF8 supabase/functions/weekly-report/index.ts -First 28` → importaciones SMTP/Supabase y configuración.
- `Get-ChildItem -Force -Name .env*,.mcp.json,supabase/.temp -ErrorAction SilentlyContinue` → caché local de vinculación presente; comando compuesto termina exit 1 por rutas ausentes.
- `Get-Date -Format 'yyyy-MM-dd HH:mm'` → 2026-09-22 00:49.
- `git status --short` → PROGRESS_LOG.md modificado de ronda anterior, .claude/ sin seguimiento; advertencia de ignore global.
- `Get-Content -Encoding UTF8 PROGRESS_LOG.md -Tail 5` → contexto de append verificado.
- Descubrimiento de herramientas mediante ALL_TOOLS (sin shell) → conector Supabase disponible; no herramienta de logs analíticos expuesta.
- Supabase list_edge_functions (solo lectura) → weekly-report ACTIVE v6 y alertas-pendientes ACTIVE v8, ambas verify_jwt=false.
- Supabase execute_sql (solo lectura): `select jobid, jobname, schedule, active from cron.job; select jobid, status, return_message, start_time, end_time from cron.job_run_details order by start_time desc limit 30; select id, status_code, timed_out, error_msg, created, left(content, 1200) as response from net._http_response order by created desc limit 15;` → herramienta devolvió el último resultset: seis respuestas recientes; error HTTP 500 JWT issued at future a las 01:00 UTC.
- Supabase execute_sql: `select jobid, jobname, schedule, active from cron.job;` → semanal y diario activos, horarios 0 9 * * 1 y 0 * * * *.
- Supabase execute_sql: `select d.jobid, j.jobname, d.status, d.return_message, d.start_time from cron.job_run_details d left join cron.job j using(jobid) where j.jobname = 'weekly-report-mega-unlock' order by d.start_time desc limit 8;` → ocho lanzamientos semanales succeeded, último 2026-09-21 09:00 UTC; esto confirma encolado HTTP, no entrega de email.
- Supabase get_edge_function weekly-report y alertas-pendientes → revisado código efectivamente desplegado; error de consulta devuelve 500 antes de SMTP, no hay reintento explícito del envío.
- Consulta web de JWT issued at future y página de estado Supabase → antecedentes externos, insuficientes para atribuir este fallo a un incidente concreto; página consultada trata latencia y figura resuelta.
- Supabase execute_sql: `select now() as database_now, current_setting('timezone') as timezone;` → 2026-09-22 03:48:59 UTC; no prueba del reloj interno de PostgREST.
- Supabase execute_sql: `select count(*) as retained_responses, min(created) as oldest_response, max(created) as newest_response, count(*) filter (where status_code >= 400) as failures from net._http_response;` → seis respuestas entre 2026-09-21 22:00 UTC y 2026-09-22 03:00 UTC, una fallida; no queda respuesta del reporte semanal.
- apply_patch (sin shell) → append de esta entrada.
Las llamadas independientes del conector se ejecutaron en paralelo. Los comandos shell se enumeran en su orden real; las consultas del conector se enumeran aparte en orden de lanzamiento.

### Archivos tocados (todos)
- `PROGRESS_LOG.md` — modificado — registra diagnóstico con evidencia remota y confirmación de mantener eliminado el tracking.

### Hallazgos y decisiones
- Fallo confirmado del resumen diario del 21 de septiembre a las 22:00 Chile (22 de septiembre 01:00 UTC): HTTP 500, {"error":"JWT issued at future"}. La función pasó el secreto de cron y el horario, pero la API rechazó la consulta antes de que se ejecutara client.send. No fue ausencia de pendientes ni fallo Gmail en ese intento.
- El cron sigue activo y la función responde 200 fuera de horario, con enviado=false. Esos 200 no significan correo enviado ni prueban recuperación del acceso a datos.
- Reporte semanal activo los lunes a las 09:00 UTC (actualmente 06:00 Chile), último lanzamiento lunes 21. Su respuesta HTTP ya no está retenida: no se puede confirmar que fallara por la misma causa ni si llegó al SMTP. No se conoce fecha del último envío exitoso.
- JWT issued at future señala rechazo temporal del token por el servicio de datos; falta determinar causa raíz (reloj/validación/credencial). No se rotaron claves, reinició infraestructura ni atribuyó con certeza a un incidente externo.
- No hay reintento explícito de recuperación ni registro durable del resultado de entrega en este código. El succeeded de pg_cron solo refleja la llamada que encola HTTP.
- No se enviaron correos de prueba ni se invocaron funciones de envío, porque el pedido fue investigar. No se cambiaron horarios, secretos, funciones ni base de datos.
- Preferencia confirmada: conservar eliminados tiempos reales y control manual de duración.

### Estado final
- Tests/build: no ejecutados en esta ronda de diagnóstico; sin cambios de código. Consultas remotas de lectura completadas; fallo diario confirmado y resultado semanal no disponible.
- Git: PROGRESS_LOG.md modificado, .claude/ previamente sin seguimiento; sin staged, commit ni push.
---

---
## [2026-09-22 00:55] Recuperación de consultas y diagnóstico de correos

### Instrucción recibida
El usuario pidió revisar y corregir el fallo de los correos automáticos detectado en producción.
Se mantiene eliminada la captura de tiempos reales.

### Comandos ejecutados (todos, en orden)
- `Get-Content -Encoding UTF8 supabase/functions/weekly-report/index.ts | Select-Object -Skip 110` → revisado handler semanal.
- `Get-Content -Encoding UTF8 supabase/functions/alertas-pendientes/index.ts | Select-Object -Skip 100` → revisado handler diario.
- `Get-Command deno,node -ErrorAction SilentlyContinue | Select-Object Name,Source` → Node disponible, Deno no disponible.
- `git status --short` → PROGRESS_LOG.md modificado y .claude/ sin seguimiento, preexistentes.
- `node --version` → v24.18.0.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md' -First 32` → repasadas instrucciones de verificación.
- `rg --files supabase -g AGENTS.md -g deno.json -g deno.jsonc` → sin coincidencias, exit 1.
- `Get-Content package.json` → scripts y versión Supabase revisados.
- `Get-Content -Encoding UTF8 supabase/functions/alertas-pendientes/index.ts -First 35` → importaciones, horario y configuración.
- `node --test supabase/functions/_shared/consultasCorreo.test.mjs` → primera pasada: 10 tests, 10 pass, 0 fail.
- `npm.cmd run lint` → exit 0, sin diagnósticos.
- `git diff --check` → sin errores; advertencias de conversión LF/CRLF.
- `$paths = @('supabase/functions/weekly-report/index.ts','supabase/functions/alertas-pendientes/index.ts','supabase/functions/_shared/consultasCorreo.ts'); $paths | ForEach-Object { @{ name = $_; content = [IO.File]::ReadAllText((Join-Path (Get-Location) $_)) } } | ConvertTo-Json -Depth 3 -Compress` → código local serializado para despliegue por conector, sin secretos.
- `node --test supabase/functions/_shared/consultasCorreo.test.mjs` → pasada final tras formateo y etapa SMTP: 10 tests, 10 pass, 0 fail.
- `npm.cmd run lint` → exit 0, sin diagnósticos.
- `git diff --check` → sin errores; advertencias LF/CRLF.
- `git diff --stat` → resumen de cambios rastreados; incluye entradas anteriores del log y no incluye nuevos archivos sin seguimiento.
- `Get-Date -Format 'yyyy-MM-dd HH:mm'` → 2026-09-22 00:55.
- `git status --short` → cinco archivos rastreados modificados, _shared/ nuevo y .claude/ preexistente.
- `Get-Content -Encoding UTF8 PROGRESS_LOG.md -Tail 5` → contexto final verificado para append.

Operaciones adicionales por herramientas (sin shell), en orden:
- ALL_TOOLS → descubiertas firmas execute_sql, deploy_edge_function, get_edge_function y search_docs.
- Consulta web changelog.md → formato no soportado; fallback a https://supabase.com/changelog exitoso. No se encontró cambio relevante que exija alterar este diseño.
- Supabase search_docs sobre reintentos y JWT → SDK tiene reintentos temporales, pero no para 401 PGRST303; validación JWT no se desactiva.
- Consulta web del código denomailer en GitHub → 404; consulta posterior deno.land → inaccesible. No se asumió ninguna API SMTP nueva.
- apply_patch → creado helper de consultas/configuración y adaptadas ambas funciones.
- apply_patch → creada suite de regresión con handlers reales y límites externos simulados.
- Supabase deploy_edge_function → weekly-report v7 y alertas-pendientes v9 ACTIVE, manteniendo verify_jwt=false y autenticación X-Cron-Secret existente.
- Supabase execute_sql → invocó únicamente diagnóstico sin envío en ambas funciones mediante net.http_post, obteniendo requests 1234 y 1235. El secreto se leyó dentro de SQL desde Vault y no se expuso.
- Supabase execute_sql: `select id, status_code, timed_out, error_msg, content from net._http_response where id in (1234,1235) order by id;` → ambos 200, ok=true, diagnostico=true, enviado=false, consultas=3, destinatarios=2.
- apply_patch → formateo de handlers y etapa SMTP antes de crear el cliente; documentación de ambas funciones.
- Supabase deploy_edge_function → versión final weekly-report v8 y alertas-pendientes v10 ACTIVE.
- Supabase execute_sql → repetido diagnóstico de las versiones finales, requests 1236 y 1237.
- Supabase execute_sql: `select id, status_code, timed_out, error_msg, content from net._http_response where id in (1236,1237) order by id;` → ambos 200, ok=true, diagnostico=true, enviado=false, consultas=3, destinatarios=2, sin timeout.
- apply_patch → append de esta entrada.

SQL exacto de ambas rondas de diagnóstico:
`select slug, net.http_post(url := 'https://smjdwyddlsraqscizrzl.supabase.co/functions/v1/' || slug || '?diagnostico=1', headers := jsonb_build_object('Content-Type', 'application/json', 'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_shared_secret')), body := '{}'::jsonb, timeout_milliseconds := 60000) as request_id from (values ('weekly-report'), ('alertas-pendientes')) f(slug);`

### Archivos tocados (todos)
- `supabase/functions/_shared/consultasCorreo.ts` — creado — reintenta solo el rechazo temporal PGRST303 específico, propaga cualquier error de consulta y valida configuración.
- `supabase/functions/_shared/consultasCorreo.test.mjs` — creado — diez pruebas de recuperación, límites, permisos, configuración, autenticación de diagnóstico, fallos parciales y SMTP.
- `supabase/functions/weekly-report/index.ts` — modificado — SDK fijado a 2.110.9, reintentos de consultas, chequeo de las tres consultas, diagnóstico sin correo, logs por etapa, cierre SMTP protegido.
- `supabase/functions/alertas-pendientes/index.ts` — modificado — mismo helper, diagnóstico autenticado fuera de horario sin enviar, errores y logs por etapa; horario normal intacto.
- `supabase/functions/weekly-report/README.md` — modificado — documenta recuperación, prueba, diagnóstico y límites de lo que demuestra cada respuesta.
- `supabase/functions/alertas-pendientes/README.md` — modificado — documenta recuperación y diagnóstico seguro.
- `PROGRESS_LOG.md` — modificado — registra cambios locales, despliegues y evidencia de verificación.

### Hallazgos y decisiones
- El error observado ocurre antes de SMTP. Se añadió recuperación acotada: hasta cuatro intentos de lectura en total, con esperas de 1, 3 y 7 segundos exclusivamente para PGRST303/JWT issued at future. No se reintentan permisos ni JWT expirados.
- En el semanal se ignoraban errores de pagosSemana y atascados; ahora cualquier consulta fallida impide enviar un reporte incompleto.
- Se fijó la dependencia Supabase y se deshabilitó persistencia/renovación de sesión en el cliente administrativo de cada función.
- Se captura y registra la etapa del fallo. SMTP se intenta una sola vez; cierre en finally y errores de cierre no convierten un envío aceptado en fracaso.
- Diagnóstico exige el secreto de cron existente, comprueba configuración y ejecuta las tres consultas reales, sin construir un envío SMTP. No devuelve filas de clientes, claves ni contraseñas.
- Las versiones finales funcionan en producción para acceso a datos/configuración. Esto demuestra recuperación actual del acceso, no demuestra que el reintento haya sido necesario en esas cuatro invocaciones ni identifica la causa raíz del reloj de PostgREST.
- Un error persistente más allá de los reintentos seguirá devolviendo 500; no se garantiza entrega durante una caída prolongada. No hay reenvío posterior/durable ni registro nuevo en tabla: logs estructurados de Edge Functions.
- No se enviaron correos de prueba: el usuario autorizó corregir, no pidió expresamente enviar mensajes. La autenticación SMTP y llegada a bandeja real quedan sin verificar; no afirmar entrega. Mantiene destinatarios y horarios.
- Sin cambios de esquema, secretos, cron, interfaz ni captura de tiempos. No se ejecutó build frontend porque no cambió src; Deno no está instalado, tests ejecutan TypeScript transpilado de handlers con dobles de SDK/SMTP y las funciones desplegadas se verificaron vía HTTP.
- Deploy autorizado por pedido de corrección; no commit ni push. .claude/ intacto.

### Estado final
- Tests/build: 10/10 tests pasan (dos rondas); lint exit 0; diff --check limpio. Dos diagnósticos finales HTTP 200 en producción, cada uno con tres consultas exitosas; SMTP real no probado.
- Git: sin staged, commit ni push; archivos anteriores modificados y dos nuevos en _shared/. Supabase ya actualizado: weekly-report v8 y alertas-pendientes v10 ACTIVE.
---

---
## [2026-09-22 00:58] Estudio de garantía elegible al registrar trabajo

### Instrucción recibida
Estudiar Garantías y evaluar agregar una casilla para elegir duración al ingresar un trabajo, conservando tres meses por defecto.

### Comandos ejecutados (todos, en orden)
- `Get-Content -Encoding UTF8 src/lib/garantia.ts,supabase/migrations/0024_garantia_vence_at.sql` → vencimiento calculado en trigger como entrega más tres meses.
- `Get-Content -Encoding UTF8 src/components/dashboard/components/FormularioServicio.tsx` → formulario con una sección por equipo; salida conjunta parcialmente truncada.
- `Get-Content -Encoding UTF8 src/components/dashboard/GarantiasTab.tsx | Select-Object -Skip 240` → Cobertura lee vencimiento y muestra texto fijo de tres meses.
- `Get-Content -Encoding UTF8 src/types.ts` → no hay duración configurable en Servicio ni EquipoForm.
- `rg -n 'garantia|equipoVacio|setEquipos|handleGuardarServicio|handleIniciarEdicion' src/components/dashboard/Dashboard.tsx src/lib/validacion.ts` → ubicados alta, edición y reinicio del formulario.
- `Get-Content -Encoding UTF8 src/components/dashboard/components/BadgeGarantia.tsx` → vigente/vencida/sin dato; sin garantía voluntaria necesitaría estado propio.
- `Get-Content -Encoding UTF8 src/components/dashboard/Dashboard.tsx | Select-Object -Skip 606 -First 23` → carga de datos para editar.
- `Get-Content -Encoding UTF8 src/components/dashboard/Dashboard.tsx | Select-Object -Skip 915 -First 17` → reactivar borra entrega y el trigger deja vencimiento nulo.
- `Get-Date -Format 'yyyy-MM-dd HH:mm'` → 2026-09-22 00:58.
- `git status --short` → cambios previos de correos/log y .claude/ sin seguimiento; no cambios nuevos de funcionalidad.
- apply_patch (sin shell) → append de esta entrada.

### Archivos tocados (todos)
- `PROGRESS_LOG.md` — modificado — añade estudio y propuesta de duración configurable por equipo.

### Hallazgos y decisiones
- Es viable un selector de duración por equipo con tres meses preseleccionados. Cambiar solo cuando se ofrezca otro plazo, sin interacción adicional en el caso habitual.
- La duración ofrecida es una decisión del taller, no se deduce de fechas ni del historial; no contradice la regla de evitar campos que pueden inferirse automáticamente.
- Debe guardarse la duración en servicios y adaptar trigger, alta/edición, tipos y textos de Cobertura. Mantener cómputo desde entrega real y conservar vencimientos históricos; no modificar tabla de reclamos.
- Si se incluye Sin garantía, debe distinguirse de Sin dato (históricos sin entrega) y Vencida. No convertir null en garantía voluntariamente ausente.
- Se propondrán plazos de ejemplo y se consultarán los usados por el usuario antes de fijar opciones. Esta ronda es estudio de la propuesta, no implementación ni migración.
- Hallazgo secundario: calcularEstadoGarantia usa ceil y >= 0, lo que puede mantener vigente un vencimiento de hace menos de 24h. Pendiente corregir con comparación de instantes cuando se implemente el cambio.

### Estado final
- Tests/build: no ejecutados; estudio sin cambios de código ni base de datos.
- Git: solo append nuevo al log; persisten cambios previos de correos y .claude/ sin seguimiento. Sin staged, commit ni push.
---

---
## [2026-09-22 09:55] Garantía por equipo implementada y probada para móvil

### Instrucción recibida
Agregar Sin garantía, 1 mes, 3 meses y 6 meses dentro de cada equipo, con tres meses por defecto.
El usuario autorizó probar y subir, priorizando iPhone, y pidió continuar tras interrumpirse la sesión.

### Comandos ejecutados (todos, en orden)
- `git status --short` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 src/lib/validacion.ts` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 src/components/dashboard/components/FormularioServicio.tsx | Select-Object -Skip 285 -First 120` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/agent-browser/SKILL.md' -First 100` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/react-best-practices/SKILL.md'` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md'` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Command agent-browser -ErrorAction SilentlyContinue | Select-Object Name,Source` → No instalado en PATH; navegador usado por npx y sin CLI gh.
- `Get-ChildItem node_modules/.bin -Name | Where-Object { $_ -match 'supabase|playwright|vite' }` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `git remote -v` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `git branch --show-current` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 src/components/dashboard/Dashboard.tsx | Select-Object -Skip 465 -First 24` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 src/components/dashboard/Dashboard.tsx | Select-Object -Skip 571 -First 19` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `npx.cmd --yes supabase --help` → EPERM al escribir caché npm; repetido con escalación.
- `npx.cmd --yes supabase --help (escalado)` → Ayuda de CLI leída correctamente con permisos de caché.
- `npx.cmd --yes supabase migration new --help` → Ayuda de CLI leída correctamente con permisos de caché.
- `npx.cmd --yes supabase migration new garantia_meses_por_equipo` → CLI creó 20260922040336_garantia_meses_por_equipo.sql.
- `npx.cmd --yes agent-browser --help (escalado)` → Ayuda de CLI leída correctamente con permisos de caché.
- `git status --short` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `git diff -- src/types.ts src/components/dashboard/Dashboard.tsx src/lib/garantia.ts` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/agent-browser-verify/SKILL.md'` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/verification/SKILL.md'` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `npm.cmd run build` → tsc y Vite exitosos; 138 módulos; build final 601 ms.
- `npm.cmd run lint` → Exit 0, sin diagnósticos.
- `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort` → Vite activo en 127.0.0.1:5173, sesión 20630.
- `npx.cmd --yes agent-browser --session garantia-iphone open http://127.0.0.1:5173` → Navegador abrió página local.
- `node --test tests/garantia.test.mjs supabase/functions/_shared/consultasCorreo.test.mjs` → 14 pruebas pasan (4 garantía + 10 correos), 0 fallos.
- `npx.cmd --yes agent-browser --session garantia-iphone set device 'iPhone 13'` → Dispositivo no soportado; se corrigió a iPhone 15.
- `npx.cmd --yes agent-browser --session garantia-iphone open http://127.0.0.1:5173/tests/garantia-browser.html` → Navegador abrió página local.
- `npx.cmd --yes agent-browser --session garantia-iphone snapshot -i` → Árbol revisado: selector, estados, valores por equipo y Cobertura.
- `$paths = @('supabase/migrations/20260922040336_garantia_meses_por_equipo.sql','tests/garantia.sql')` → Ejecutado para preparar o comprobar la implementación; sin cambios a trabajos reales.
- `$paths | ForEach-Object { @{ name = $_` → Ejecutado para preparar o comprobar la implementación; sin cambios a trabajos reales.
- `content = [IO.File]::ReadAllText((Join-Path (Get-Location) $_)) } } | ConvertTo-Json -Depth 3 -Compress` → Ejecutado para preparar o comprobar la implementación; sin cambios a trabajos reales.
- `npx.cmd --yes agent-browser --session garantia-iphone set device 'iPhone 15'` → Dimensiones móviles aplicadas.
- `npx.cmd --yes agent-browser --session garantia-iphone eval "JSON.stringify({width:innerWidth,scroll:document.documentElement.scrollWidth,garantia:document.querySelector('#garantia-equipo-0').value,font:getComputedStyle(document.querySelector('#garantia-equipo-0')).fontSize,height:document.querySelector('#garantia-equipo-0').getBoundingClientRect().height})"` → 393 px de ancho sin overflow; selector 16 px y altura 49 px; default 3.
- `npx.cmd --yes agent-browser --session garantia-iphone errors` → Sin errores de aplicación reportados.
- `npx.cmd --yes agent-browser --session garantia-iphone fill 'input[placeholder="Ej. Carlos / Willy"]' 'Prueba Garantia'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone fill 'input[placeholder="Ej. Xiaomi Redmi Note 12"]' 'Equipo prueba A'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone fill 'input[placeholder="0.00"]' '15000'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone select '#garantia-equipo-0' '0'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone click 'text=+ Agregar otro equipo (mismo cliente)'` → Selector textual no encontrado; repetido mediante ref e34.
- `npx.cmd --yes agent-browser --session garantia-iphone snapshot -i` → Árbol revisado: selector, estados, valores por equipo y Cobertura.
- `npx.cmd --yes agent-browser --session garantia-iphone click '@e34'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone eval "JSON.stringify(Array.from(document.querySelectorAll('select[id^=garantia-equipo]')).map(e=>e.value))"` → Error de sintaxis por quoting de .cmd; creó archivo vacío e.value)), luego eliminado.
- `npx.cmd --yes agent-browser --session garantia-iphone snapshot -i` → Árbol revisado: selector, estados, valores por equipo y Cobertura.
- `npx.cmd --yes agent-browser --session garantia-iphone fill '@e180' 'Equipo prueba B'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone fill '@e176' '20000'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone select '#garantia-equipo-1' '6'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone click '@e35'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone eval 'JSON.stringify(window.garantiaQA.escrituras)'` → Inspección de escrituras simuladas; primer intento vacío por campos requeridos, tras completar por refs POST contiene plazos 0 y 6.
- `npx.cmd --yes agent-browser --session garantia-iphone eval "document.getElementById('garantia-equipo-0').value"` → Ejecutado para preparar o comprobar la implementación; sin cambios a trabajos reales.
- `npx.cmd --yes agent-browser --session garantia-iphone snapshot -i` → Árbol revisado: selector, estados, valores por equipo y Cobertura.
- `npx.cmd --yes agent-browser --session garantia-iphone fill '@e36' 'Prueba Garantia'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone fill '@e45' 'Equipo prueba A'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone fill '@e41' '15000'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone click '@e35'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone eval 'JSON.stringify(window.garantiaQA.escrituras)'` → Inspección de escrituras simuladas; primer intento vacío por campos requeridos, tras completar por refs POST contiene plazos 0 y 6.
- `npx.cmd --yes agent-browser --session garantia-iphone snapshot -i` → Árbol revisado: selector, estados, valores por equipo y Cobertura.
- `npx.cmd --yes agent-browser --session garantia-iphone click '@e216'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone get value '#garantia-equipo-0'` → Edición recupera correctamente 0 (sin garantía).
- `npx.cmd --yes agent-browser --session garantia-iphone select '#garantia-equipo-0' '1'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone scrollintoview '#garantia-equipo-0'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone screenshot node_modules/.tmp/garantia-form-iphone.png` → Captura generada y revisada visualmente con view_image.
- `npx.cmd --yes agent-browser --session garantia-iphone snapshot -i` → Árbol revisado: selector, estados, valores por equipo y Cobertura.
- `npx.cmd --yes agent-browser --session garantia-iphone click '@e35'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone eval 'JSON.stringify(window.garantiaQA.escrituras.at(-1))'` → PATCH real del Dashboard hacia API simulada contiene garantia_meses=1.
- `npx.cmd --yes agent-browser --session garantia-iphone click '@e28'` → Interacción en fixture local; resultados comprobados con snapshot/payload.
- `npx.cmd --yes agent-browser --session garantia-iphone set viewport 375 812` → Dimensiones móviles aplicadas.
- `npx.cmd --yes agent-browser --session garantia-iphone eval 'JSON.stringify({width:innerWidth,scroll:document.documentElement.scrollWidth})'` → Ancho de documento igual al viewport (375 o 320 px); sin overflow.
- `npx.cmd --yes agent-browser --session garantia-iphone screenshot node_modules/.tmp/garantia-cobertura-iphone.png` → Captura generada y revisada visualmente con view_image.
- `npx.cmd --yes agent-browser --session garantia-iphone snapshot` → Árbol revisado: selector, estados, valores por equipo y Cobertura.
- `npm.cmd run build` → tsc y Vite exitosos; 138 módulos; build final 601 ms.
- `npm.cmd run lint` → Exit 0, sin diagnósticos.
- `git diff --check` → Sin errores de whitespace; avisos LF/CRLF.
- `npx.cmd --yes agent-browser --session garantia-iphone errors` → Sin errores de aplicación reportados.
- `npx.cmd --yes agent-browser --session garantia-iphone set viewport 320 740` → Dimensiones móviles aplicadas.
- `npx.cmd --yes agent-browser --session garantia-iphone eval 'JSON.stringify({width:innerWidth,scroll:document.documentElement.scrollWidth})'` → Ancho de documento igual al viewport (375 o 320 px); sin overflow.
- `git log -3 --oneline` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Date -Format 'yyyy-MM-dd HH:mm'` → Hora local registrada; última 2026-09-22 09:55.
- `Rename-Item -LiteralPath 'supabase/migrations/20260922040336_garantia_meses_por_equipo.sql' -NewName '20260922125047_garantia_meses_por_equipo.sql'` → Nombre sincronizado con versión remota 20260922125047.
- `rg -n 'vercel.app|netlify.app|github.io|https://.*mega|deploy|hosting' PROGRESS_LOG.md README.md .github -g '*' ` → Sin URL de producción encontrada; .github no existe.
- `git diff --numstat` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-ChildItem -Force -Name` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Item -LiteralPath 'e.value))' | Select-Object Name,Length` → Confirmado archivo accidental de 0 bytes.
- `Remove-Item -LiteralPath 'e.value))'` → Eliminado exclusivamente archivo vacío accidental e.value)).
- `Get-Content -Encoding UTF8 vercel.json` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/vercel-api/SKILL.md'` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/deployments-cicd/SKILL.md' -First 110` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `git diff -- src/components/dashboard/GarantiasTab.tsx src/components/dashboard/components/BadgeGarantia.tsx src/components/dashboard/components/FormularioServicio.tsx src/lib/validacion.ts` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Content -Encoding UTF8 'C:/Users/Xavier Bello/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/react-best-practices/SKILL.md' -First 80` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Command gh -ErrorAction SilentlyContinue | Select-Object Name,Source` → No instalado en PATH; navegador usado por npx y sin CLI gh.
- `git diff --check` → Sin errores de whitespace; avisos LF/CRLF.
- `git status --short` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-ChildItem dist -Recurse -File | Select-Object -ExpandProperty FullName` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `git fetch origin` → Falló por permiso sobre .git/FETCH_HEAD.
- `git fetch origin (escalado)` → Exitoso; origin/main sin divergencia con HEAD.
- `git rev-list --left-right --count HEAD...origin/main` → 0 0: sin commits divergentes.
- `git diff --name-only` → Lectura/inspección completada; código y cambios revisados. .claude/ preexistente intacto.
- `Get-Date -Format 'yyyy-MM-dd HH:mm'` → Hora local registrada; última 2026-09-22 09:55.

Operaciones de herramientas adicionales, sin shell:
- Lectura de firmas Supabase y documentación oficial de triggers PostgreSQL → comportamiento UPDATE OF verificado.
- Supabase execute_sql → función previa y columnas actuales inspeccionadas (sin duración configurable).
- apply_patch → UI, tipos, validación, migración, pruebas y fixture de Dashboard; correcciones menores de comentarios/indentación.
- execute_sql → migración y tests/garantia.sql probados juntos en transacción terminada en rollback; PASS.
- view_image → inspección visual de ambas capturas móviles.
- execute_sql → huella previa de vencimientos: 970 registros, 57 sin fecha, MD5 c978beec894e99d6d5886dc5e064d98e.
- apply_migration garantia_meses_por_equipo → aplicada correctamente en producción.
- execute_sql → mismos 970 registros, mismos 57 sin fecha y MISMA huella de vencimientos; 970 con plazo 3 meses.
- execute_sql de tests/garantia.sql después de migrar → PASS en tabla temporal, rollback, sin trabajos de prueba persistidos.
- get_advisors security → sin hallazgos sobre el trigger nuevo; avisos de objetos preexistentes (RLS sin políticas, unaccent público, funciones SECURITY DEFINER y protección de contraseñas desactivada). No se modificaron objetos ajenos al alcance. Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable y https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- execute_sql de supabase_migrations.schema_migrations → versión remota 20260922125047; archivo local renombrado para coincidir.
- Vercel list_teams → cuenta conectada devolvió lista vacía; no permite confirmar despliegue por ese conector.
- apply_patch → esta entrada de progreso, previa al commit/push.

### Archivos tocados (todos)
- `src/types.ts` — modificado — plazo 0/1/3/6 en servicio y formulario, default 3.
- `src/components/dashboard/Dashboard.tsx` — modificado — envía plazo en alta/edición y lo recupera con ?? para no perder el cero.
- `src/components/dashboard/components/FormularioServicio.tsx` — modificado — selector nativo por equipo, etiqueta accesible, ayuda contextual, fuente 16 px y altura mínima 48 px.
- `src/components/dashboard/GarantiasTab.tsx` — modificado — plazo elegido, sin garantía en ámbar y layout envolvente para móvil; elimina afirmación fija de tres meses.
- `src/components/dashboard/components/BadgeGarantia.tsx` — modificado — diferencia Sin garantía / Sin dato / Vencida.
- `src/lib/garantia.ts` — modificado — vigencia por instante exacto, sin día extra por redondeo; fechas inválidas devuelven null.
- `src/lib/validacion.ts` — modificado — rechaza plazos diferentes a 0,1,3,6.
- `supabase/migrations/20260922040336_garantia_meses_por_equipo.sql` — creado y renombrado — archivo inicial generado por CLI.
- `supabase/migrations/20260922125047_garantia_meses_por_equipo.sql` — renombrado / modificado — versión remota correspondiente; columna con default/check y trigger según plazo, con search_path y UTC explícitos.
- `tests/garantia.test.mjs` — creado — cuatro pruebas de plazos, independencia y vigencia.
- `tests/garantia.sql` — creado — pruebas del trigger real, meses calendario, edición, reactivación, históricos y restricción, solo tabla temporal.
- `tests/garantia-browser.html` — creado — entrada local para QA.
- `tests/garantia-browser.tsx` — creado — Dashboard real con API simulada y captura de escrituras; bloquea llamadas externas y no se incluye en dist.
- `tests/README.md` — creado — instrucciones de pruebas y límites de emulación.
- `PROGRESS_LOG.md` — modificado — append de implementación y verificaciones.
- `e.value))` — creado / borrado — archivo vacío accidental del comando eval con quoting de .cmd; eliminado.
- `node_modules/.tmp/garantia-form-iphone.png` — creado — captura de selector móvil (ignorada por Git).
- `node_modules/.tmp/garantia-cobertura-iphone.png` — creado — captura de cobertura móvil (ignorada por Git).
- `node_modules/.tmp/tsconfig.app.tsbuildinfo` — modificado — caché de compilación ignorada.
- `node_modules/.tmp/tsconfig.node.tsbuildinfo` — generado / actualizado por build — caché ignorada.
- `dist/index.html` — modificado — manifiesto de salida Vite.
- `dist/favicon.svg` — regenerado — copia de recurso público.
- `dist/icons.svg` — regenerado — copia de recurso público.
- `dist/manifest.json` — regenerado — copia de manifiesto público.
- `dist/assets/index-DYwLnl9H.css` — creado — CSS compilado con selector.
- `dist/assets/index-pNtJc24m.js` — creado — aplicación compilada.
- `dist/assets/rolldown-runtime-DAXXjFlN.js` — regenerado — runtime de build.
- `dist/assets/src-BHyPwket.js` — regenerado — chunk existente de OCR.
- `dist/assets/vendor-LbrMf0co.js` — regenerado — dependencias sin cambios.
- `dist/assets/index-CH42tBQ0.css` — borrado por Vite — reemplazado por nuevo hash de CSS.
- `dist/assets/index-Ci3FQ1X8.js` — borrado por Vite — reemplazado por nuevo hash de aplicación.

### Hallazgos y decisiones
- Selector por equipo, no por cliente; default 3, inicio desde entrega real. Sin nuevos cálculos por tecla, peticiones extra ni dependencias.
- Meses calendario calculados en DB. Cambiar plazo de un entregado recalcula desde su entrega original. Edición sin cambios preserva vencimiento exacto; reactivar borra vencimiento y nueva entrega usa el plazo conservado.
- Migración compatible con frontend anterior porque default 3 en DB; no modifica vencimientos históricos ni crea fechas para casos Sin dato.
- Prueba navegador: POST del Dashboard con dos equipos registra 0 y 6; editar el primero recupera 0, luego PATCH registra 1; nuevo formulario vuelve a 3.
- Cobertura revisada con sin garantía, 1/3/6 meses, histórico sin fecha y vencido hace un minuto.
- iPhone emulado en Chromium: selector de 49 px, fuente de 16 px, etiqueta vinculada. Sin overflow a 393,375,320 px; no es prueba en hardware Safari/iOS.
- Corrección relacionada: antes un vencimiento de hace menos de 24h seguía vigente por Math.ceil; ahora compara instantes.
- La fixture usa datos falsos en memoria, no se agregaron clientes ni servicios de prueba a producción.
- Revisión React: sin efectos nuevos, estado por equipo existente, JSX pequeño y select nativo. Aumento JS principal aproximado 1.65 kB sin comprimir frente a build inicial.
- Se incluirán en la publicación los archivos de correos ya corregidos y probados en la ronda anterior, para sincronizar Git con funciones desplegadas v8/v10. No se alteraron nuevamente en esta ronda.
- Avisos de seguridad preexistentes anotados arriba, pendientes de revisión separada; no se ampliaron permisos para esta función.

### Estado final
- Tests/build: 14/14 pruebas Node pasan, dos pruebas SQL PASS (antes/después), build y lint exitosos, diff --check sin errores. Navegador sin errores de aplicación y flujos móviles comprobados.
- Git: cambios probados aún sin staged/commit al escribir esta entrada; HEAD y origin/main alineados. Próximo paso autorizado: commit y push. .claude/ permanece fuera.
---
---
## [2026-09-22 10:10] Publicación verificada de garantías

### Instrucción recibida
Retomar el trabajo, terminarlo, probarlo y subirlo, priorizando iPhone.

### Comandos ejecutados (todos, en orden)
- `git add PROGRESS_LOG.md src/types.ts src/components/dashboard/Dashboard.tsx src/components/dashboard/GarantiasTab.tsx src/components/dashboard/components/BadgeGarantia.tsx src/components/dashboard/components/FormularioServicio.tsx src/lib/garantia.ts src/lib/validacion.ts supabase/migrations/20260922125047_garantia_meses_por_equipo.sql tests/README.md tests/garantia.test.mjs tests/garantia.sql tests/garantia-browser.html tests/garantia-browser.tsx supabase/functions/_shared/consultasCorreo.ts supabase/functions/_shared/consultasCorreo.test.mjs supabase/functions/weekly-report/index.ts supabase/functions/weekly-report/README.md supabase/functions/alertas-pendientes/index.ts supabase/functions/alertas-pendientes/README.md` → 20 archivos preparados.
- `git diff --cached --stat` → 20 archivos, 1070 inserciones y 202 eliminaciones.
- `git diff --cached --check` → sin errores.
- `git commit -m "Agrega garantia por equipo optimizada para movil y recuperacion de correos"` → f67d07983547b35a56227b3ca7f9497eb35257f8.
- `git push origin main` → publicado a3f4a9c..f67d079.
- `git status --short` → únicamente .claude/ sin seguimiento, preexistente.
- `git rev-parse HEAD` → f67d07983547b35a56227b3ca7f9497eb35257f8.
- `git rev-list --left-right --count HEAD...origin/main` → 0 0.
- `(Invoke-RestMethod -Uri 'https://api.github.com/repos/Belloxavier/mega-unlock-system/commits/f67d079/status').statuses | Select-Object state,context,target_url,description` → falló conexión dentro del sandbox.
- `(Invoke-RestMethod -Uri 'https://api.github.com/repos/Belloxavier/mega-unlock-system/commits/f67d079/status').statuses | Select-Object state,context,target_url,description` → reintento autorizado fuera del sandbox: Vercel success.
- `Get-Content PROGRESS_LOG.md -Tail 18` → revisado cierre anterior.
- `Get-Date -Format 'yyyy-MM-dd HH:mm'` → 2026-09-22 10:10.
- `git status --short` → únicamente .claude/; advertencias de lectura del ignore global por permisos.
- `Get-Content PROGRESS_LOG.md -Tail 4` → detectado marcador accidental de edición; retirado antes de publicar.
- Comandos de cierre de esta entrada: `git add PROGRESS_LOG.md`, `git commit -m "Documenta publicacion verificada de garantias"`, `git push origin main`, `git status --short` → se ejecutan a continuación; resultado comprobado en la respuesta final.

### Archivos tocados (todos)
- `PROGRESS_LOG.md` — modificado — agregado registro de commit, push y confirmación del despliegue; retirado marcador accidental.

### Hallazgos y decisiones
- GitHub informa Vercel success para f67d079. Despliegue: https://vercel.com/belloxaviers-projects/mega-unlock-system/J9Zxjw4vifdKDkmThdUB1iYLcoHt.
- Implementación y migración ya publicadas. No se modificó código después de las pruebas documentadas en la entrada anterior.
- .claude/ permanece fuera del commit.
- Validación móvil mediante Chromium emulado; no se probó Safari en un iPhone físico.

### Estado final
- Tests/build: 14/14 pruebas Node, SQL antes/después, build y lint correctos según entrada anterior. Vercel success confirmado por GitHub.
- Git: commit funcional f67d079 publicado en origin/main; esta entrada se publica en un commit documental de cierre.
---

---
## [2026-09-22 21:39] Garantía sin garantía por defecto en FRP + nuevos tipos de servicio

### Instrucción recibida
1. El usuario pidió que FRP arranque en "Sin garantía" por defecto (quitar la cuenta Google no es culpa del taller si el cliente luego olvida su propia clave nueva).
2. Agregar tipos de servicio nuevos a la lista: Cambio de Pantalla, Logo Claro, Activación IMEI 2 Xiaomi, Virus, Batería, Mantenimiento, y un tipo para cuando el usuario solo cobra mano de obra por instalar un repuesto que trae el técnico/cliente (sin garantía porque el taller no vendió la pieza) — el usuario pidió sugerencia de nombre, eligió "Instalación de repuesto de terceros" de tres opciones ofrecidas.

### Comandos ejecutados (todos, en orden)
- `Read src/types.ts` (completo) → confirmó forma de `Servicio`/`EquipoForm`/`equipoVacio`, `garantiaMeses` ya existente (0|1|3|6, default 3).
- `Grep "tipoTrabajo|TIPOS_TRABAJO|Cuenta Mi|FRP" src/components/dashboard/components/FormularioServicio.tsx` → ubicó el `<select>` de tipo de servicio (línea ~263-275).
- `Read src/components/dashboard/components/FormularioServicio.tsx` (líneas 255-354 y 365-399) → confirmó estructura del select de tipo de servicio y del select de garantía con su texto de ayuda.
- `Grep "onCambiarEquipo|cambiarEquipo|setEquipos|equipoVacio" src/components/dashboard/Dashboard.tsx` → ubicó `handleCambiarEquipo` (línea 365) como único punto que actualiza un equipo del formulario.
- `Read src/components/dashboard/Dashboard.tsx` (líneas 360-405) → confirmó `handleCambiarEquipo` genérico sin lógica especial por campo.
- `Read src/lib/garantia.ts` (completo) → confirmó `calcularEstadoGarantia`, sin helper de default aún.
- `AskUserQuestion` (qué lista) → usuario aclaró que "agregar otros servicios" era sobre la lista de tipos de servicio del selector, no sobre la lista de tipos sin-garantía-por-defecto.
- `AskUserQuestion` (nombre del tipo de instalación de terceros) → usuario eligió "Instalación de repuesto de terceros" entre 3 opciones.
- Edit en `src/lib/garantia.ts` → nueva función `garantiaPorDefecto(tipoTrabajo)`, usa un `Set` (`SIN_GARANTIA_POR_DEFECTO`) con 'FRP' e 'Instalación de repuesto de terceros'; retorna 0 si el tipo está en el set, 3 en caso contrario.
- Edit en `src/types.ts` → agregó `garantiaMesesManual?: boolean` a `EquipoForm` (campo interno, no se muestra en UI, no forma parte del payload a Supabase).
- `Grep "^import.*garantia" src/components/dashboard/Dashboard.tsx` → confirmó que no existía import previo de `lib/garantia`.
- `Read src/components/dashboard/Dashboard.tsx` (líneas 1-20) → ubicó bloque de imports para insertar el nuevo.
- Edit en `src/components/dashboard/Dashboard.tsx` → agregó `import { garantiaPorDefecto } from '../../lib/garantia'`.
- Edit en `src/components/dashboard/Dashboard.tsx` → `handleCambiarEquipo` ahora: si el campo cambiado es `garantiaMeses`, marca `garantiaMesesManual = true`; si el campo es `tipoTrabajo` y el equipo NO tiene `garantiaMesesManual`, recalcula `garantiaMeses` con `garantiaPorDefecto(valor)`.
- `Read src/components/dashboard/Dashboard.tsx` (líneas 600-640) → ubicó `handleIniciarEdicion`, que carga un servicio existente al formulario de edición.
- Edit en `src/components/dashboard/Dashboard.tsx` → `handleIniciarEdicion` ahora setea `garantiaMesesManual: true` al cargar un servicio para editar (para que corregir el tipo de servicio en edición no recalcule silenciosamente una garantía ya guardada).
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` (primera ronda, solo cambio de FRP) → limpio.
- Edit en `src/components/dashboard/components/FormularioServicio.tsx` → texto de ayuda bajo el selector de garantía ahora distingue 3 casos: sin garantía auto por FRP, sin garantía elegida a mano, "se cuenta desde la entrega" para plazos >0.
- Edit en `tests/garantia.test.mjs` → agregó import de `garantiaPorDefecto` y test "FRP sugiere sin garantía por defecto, el resto conserva tres meses".
- `node --test tests/garantia.test.mjs` (primera ronda) → 5/5 pasan.
- `Read src/lib/folio.ts` (completo) → confirmó `TIPOS_ESTANDAR` (array cerrado usado por `handleIniciarEdicion` para decidir select vs "Otros") y `PREFIJOS_FOLIO` (prefijo de folio por tipo, ej. F1, I1, M1).
- Edit en `src/lib/folio.ts` → agregó 7 tipos nuevos a `TIPOS_ESTANDAR` y sus prefijos a `PREFIJOS_FOLIO`: Cambio de Pantalla→P, Logo Claro→LC, Activación IMEI 2 Xiaomi→I2, Virus→V, Batería→B, Mantenimiento→MT, Instalación de repuesto de terceros→IT (verificado sin colisión con F/I/M/R/IC/S existentes).
- Edit en `src/components/dashboard/components/FormularioServicio.tsx` → agregó las 7 opciones nuevas al `<select>` de tipo de servicio, antes de "Otros".
- `Grep "'Cuenta Mi'|\"Cuenta Mi\"|'Software General'|'iCloud'" src/ --include=*.ts --include=*.tsx` (excluyendo FormularioServicio/folio.ts) → único resultado: `types.ts` línea 70 (`equipoVacio` default), confirmando que no hay otra lista cerrada de tipos de trabajo que actualizar (precios sugeridos y estadísticas ya usan `tipo_trabajo` como texto libre).
- Edit en `src/components/dashboard/components/FormularioServicio.tsx` → texto de ayuda de garantía ahora distingue también el caso "Instalación de repuesto de terceros" sin garantía por defecto.
- `npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint` (segunda ronda, tras tipos nuevos) → limpio.
- Edit en `tests/garantia.test.mjs` → test renombrado y ampliado: cubre FRP, Instalación de repuesto de terceros, Cuenta Mi, iCloud y Cambio de Pantalla.
- `node --test tests/garantia.test.mjs` (segunda ronda) → 5/5 pasan.
- `Get-Date -Format 'yyyy-MM-dd HH:mm'` (vía `date`) → 2026-09-22 21:39.

### Archivos tocados (todos)
- `src/lib/garantia.ts` — modificado — nueva función `garantiaPorDefecto(tipoTrabajo)` y set `SIN_GARANTIA_POR_DEFECTO` ('FRP', 'Instalación de repuesto de terceros').
- `src/types.ts` — modificado — agregó `garantiaMesesManual?: boolean` a `EquipoForm` (campo interno, no llega a Supabase).
- `src/components/dashboard/Dashboard.tsx` — modificado — import de `garantiaPorDefecto`; `handleCambiarEquipo` autocompleta/recalcula garantía por tipo de servicio salvo elección manual; `handleIniciarEdicion` marca la garantía cargada como manual.
- `src/components/dashboard/components/FormularioServicio.tsx` — modificado — 7 opciones nuevas en el select de tipo de servicio (Cambio de Pantalla, Logo Claro, Activación IMEI 2 Xiaomi, Virus, Batería, Mantenimiento, Instalación de repuesto de terceros); texto de ayuda de garantía distingue auto-FRP, auto-instalación-terceros, manual y con plazo.
- `src/lib/folio.ts` — modificado — 7 tipos nuevos en `TIPOS_ESTANDAR` con sus prefijos de folio en `PREFIJOS_FOLIO`.
- `tests/garantia.test.mjs` — modificado — test de `garantiaPorDefecto` con los dos tipos sin-garantía y tres tipos con garantía normal.
- `PROGRESS_LOG.md` — modificado — esta entrada.

### Hallazgos y decisiones
- El autocompletado de garantía por tipo de servicio solo pisa el valor mientras el usuario no haya tocado el selector de garantía a mano en ese equipo (`garantiaMesesManual`); es un campo interno del formulario, no se guarda en Supabase ni se muestra en la UI como campo propio — cumple la regla de oro de CLAUDE.md (inferir en vez de pedir).
- Al editar un trabajo existente se marca la garantía cargada como manual, para que corregir el tipo de servicio en edición no recalcule silenciosamente una garantía ya fijada y potencialmente distinta del default actual del tipo.
- Solo FRP e "Instalación de repuesto de terceros" quedan en 0 meses por defecto; el resto de los tipos nuevos (Cambio de Pantalla, Logo Claro, Activación IMEI 2 Xiaomi, Virus, Batería, Mantenimiento) mantienen el default general de 3 meses — no se pidió lo contrario para esos.
- Prefijos de folio nuevos verificados sin colisión con los 6 existentes (F, I, M, R, IC, S).
- No se tocó `dificultad`/precios sugeridos ni estadísticas: ambos ya trabajan con `tipo_trabajo` como texto libre, no dependen de una lista cerrada.

### Estado final
- Tests/build: `tsc --noEmit` limpio, `npm run build` exitoso (dos rondas), `npm run lint` (oxlint) sin errores, `node --test tests/garantia.test.mjs` 5/5 en ambas rondas.
- Git: sin staged, commit ni push — cambios solo en working tree local, pendientes de tu visto bueno para subir.
---

---
## [2026-09-23 01:10] Link de pago WhatsApp, diagnóstico de correos y revisión de migraciones/seguridad (fase local, esperando confirmación)

### Instrucción recibida
Tres tareas con la regla de siempre: primero local, nada a producción/GitHub/base de datos sin visto bueno. (1) Reintento de fetchCuentas + recarga en "online"/pestaña visible + aviso antes de mandar WhatsApp sin link de pago. (2) Registrar migraciones 0022/0023/0024 con `supabase migration repair`, mostrando el comando antes. (3) Revisar Security/Performance Advisor y proponer. Además: los correos automáticos no llegan desde el 9-sep.

### Comandos ejecutados (todos, en orden)
- `ToolSearch` (herramientas Supabase) → cargadas.
- `grep` en Dashboard.tsx (linkPago/window.open/wa.me) + chequeo de variable SUPABASE_ACCESS_TOKEN (sin mostrar valor) → no hay token en el entorno.
- `Read Dashboard.tsx` 640-840 → flujo de enviarAvisoEquiposListos / aplicarCambioEstado.
- Supabase `get_advisors security` → 5 tablas con RLS sin políticas, unaccent en public, 3 funciones SECURITY DEFINER ejecutables por anon/authenticated, protección de contraseñas filtradas desactivada.
- Supabase `get_advisors performance` → 2 FK sin índice (tabla jobs), 5 índices sin uso.
- Supabase `execute_sql` sobre cron.job (comando con secretos enmascarados) → weekly-report (lunes 09 UTC) y alertas-pendientes (cada hora) activos.
- Supabase `execute_sql` sobre cron.job_run_details, últimos 20 días → todos "succeeded" (solo significa que se encoló la llamada HTTP).
- Supabase `execute_sql` sobre net._http_response → a las 22h Chile (01:00 UTC 23-sep) status 500, etapa smtp.
- Supabase `query_logs` function_logs 00:30-01:30 UTC → error real: `Cannot read properties of undefined (reading 'catch')`.
- `grep` catch/close en ambas edge functions → `await client.close().catch(...)`.
- `curl` al código de denomailer 1.6.0 (client/mod.ts) → firma `close(): void | Promise<void>`: puede devolver void y entonces `.catch` revienta.
- `sed`/`grep` Dashboard.tsx (otros envíos de WhatsApp, setConfirm) + `cat ConfirmSheet.tsx` → estructura de la hoja de confirmación.
- `Write src/hooks/useCuentasBancarias.ts` → reintentos + listeners + estadoCuentasRef.
- `python` (edición de ConfirmSheet.tsx) → prop onCancelAction.
- `python` (edición de Dashboard.tsx) + `npx tsc --noEmit` → error por salto de línea literal dentro de un string; corregido con Edit.
- `npx tsc --noEmit && npm run lint && npm run build` → limpio.
- Edit de la sangría de un comentario en Dashboard.tsx.
- `wc/grep/cat tests/garantia-browser.*` + `Read tests/garantia-browser.tsx` → técnica de fixture con API simulada.
- Creación temporal de `tests/qa-cuentas.html` y `tests/qa-cuentas.tsx` (API simulada, sin tocar Supabase) + `curl` al dev server → 200.
- `agent-browser` (PowerShell, sesión qa-cuentas) → falló por conflicto de daemon; `TaskStop`; `agent-browser close --all` y nueva sesión qa2.
- `agent-browser eval qa.llamadasCuentas` → 14 y luego 24 llamadas; investigado.
- `sed` sobre el fixture para agregar contadores por tabla → servicios 4, garantías 2, cuentas 14 (solo cuentas se repetía).
- `Grep` en node_modules/@supabase/postgrest-js → el SDK reintenta solo (3 reintentos, 1/2/4s) en errores de red y 503/520; eso multiplicaba mis 3 intentos (12 llamadas en ~25s).
- `sed` sobre el fixture para simular una falla de red real (`TypeError: Failed to fetch`).
- `agent-browser` flujo Avisar → Enviar → aparece la hoja "FALTA EL LINK DE PAGO" con botones REINTENTAR / ENVIAR IGUAL. OK.
- `agent-browser` con qa.fallar=false + REINTENTAR → hoja "Cuentas cargadas" → Enviar → URL de WhatsApp CON "Datos para transferencia". OK.
- `agent-browser` ENVIAR IGUAL → URL de WhatsApp SIN link (esperado). OK.
- Varios `agent-browser eval` con comillas dobles/paréntesis → fallaron por el quoting de npx.cmd en Windows ("C:\Program no se reconoce"); se agregaron atajos volverInternet()/volverPestana() al fixture.
- Edit de useCuentasBancarias.ts → `.retry(false)` en la consulta (solo quedan mis 3 intentos).
- `npx tsc --noEmit` + `agent-browser` → carga inicial de 6 llamadas (3 × doble montaje de StrictMode en dev) y luego se detiene; evento online → +1; pestaña visible → +1. OK.
- `agent-browser` Avisar → Enviar tras la recarga → WhatsApp directo con link, sin aviso; `agent-browser errors` → sin errores. OK.
- `agent-browser close --all`; `rm tests/qa-cuentas.html tests/qa-cuentas.tsx`; `tsc` OK; `npm run lint` OK; `npm run build` OK; `node --test` garantía + correos → 15/15.
- `grep close` en consultasCorreo.test.mjs + `sed` weekly-report 210-240 → la prueba simulaba close() como async, por eso no detectaba el bug.
- `python` → ambas edge functions pasan a usar try/catch alrededor de `await client.close()`.
- `python` → la prueba usa close() síncrono, como denomailer real; `node --test` → 10/10.
- `git stash push` (solo las 2 edge functions) + `node --test` → código ANTERIOR: 9 pass / 1 fail (bug reproducido); `git stash pop` → cambios restaurados.
- `npx supabase --version` → 2.117.0; `npx supabase projects list` → sin sesión (LegacyPlatformAuthRequiredError); `supabase/.temp` existe (proyecto linkeado, carpeta ignorada por git).
- Supabase `execute_sql` sobre las columnas de supabase_migrations.schema_migrations → version/statements/name/...
- Supabase `execute_sql` con el conteo de las tablas sin políticas → folio_contadores 7 filas; imei_serie, jobs, services y technicians 0 filas.
- Supabase `execute_sql` con la definición de asignar_folios / siguiente_folio / rls_auto_enable → las 3 ya tienen search_path fijo.
- `Grep` en src/ y supabase/ → la app solo usa asignar_folios (RPC) y folio_contadores a través de las funciones; nunca imei_serie/jobs/services/technicians; unaccent solo aparece en la migración 0022.
- Supabase `execute_sql` has_function_privilege para anon/authenticated → las 3 funciones son ejecutables por ambos roles.
- Supabase `execute_sql` sobre las funciones de public (unaccent/search_path) → ninguna función usa unaccent; todas tienen search_path fijo.
- Supabase `execute_sql` sobre pg_policies → servicios/clientes/garantias/cierres_caja solo para authenticated; cuentas_bancarias con SELECT para anon+authenticated (página pública /pago).
- Supabase `execute_sql` buscando índices/columnas/vistas/funciones que usen unaccent → ninguno.
- Supabase `get_project` / `search_docs` / `get_organization` → plan Free; la protección de contraseñas filtradas requiere plan Pro.
- Supabase `execute_sql` con el proacl de las 3 funciones y pg_event_trigger → rls_auto_enable es el event trigger `ensure_rls` de Supabase (activa RLS en tablas nuevas); tiene grants explícitos a anon/authenticated y PUBLIC.
- `date` → 2026-09-23 01:10.
- `cat >> PROGRESS_LOG.md` con heredoc → falló por una comilla en el texto; entrada agregada con Edit.

### Archivos tocados (todos)
- `src/hooks/useCuentasBancarias.ts` — modificado — 3 intentos (esperas de 1s y 3s) con `.retry(false)` del SDK, recarga en el evento `online` y al volver a la pestaña (solo si hay internet); `fetchCuentas` devuelve true/false y el hook expone `estadoCuentasRef` (cargadas/cantidad).
- `src/components/dashboard/components/ConfirmSheet.tsx` — modificado — prop opcional `onCancelAction` para el botón izquierdo (tocar fuera sigue solo cerrando).
- `src/components/dashboard/Dashboard.tsx` — modificado — nuevo `confirmarSiFaltaLinkPago` (hoja "Falta el link de pago" con Reintentar / Enviar igual) en los dos caminos de "equipo(s) listo(s)"; linkPago se calcula desde el ref para no usar datos viejos después de reintentar; ConfirmState acepta onCancelAction.
- `supabase/functions/alertas-pendientes/index.ts` — modificado — cierre SMTP con try/catch (antes, `.catch` sobre void rompía el envío).
- `supabase/functions/weekly-report/index.ts` — modificado — mismo arreglo del cierre SMTP.
- `supabase/functions/_shared/consultasCorreo.test.mjs` — modificado — la simulación de SMTP usa close() síncrono, como la librería real.
- `tests/qa-cuentas.html`, `tests/qa-cuentas.tsx` — creados y borrados — fixture temporal de prueba.
- `PROGRESS_LOG.md` — modificado — esta entrada.

### Hallazgos y decisiones
- CORREOS: dos fallas en cadena. Hasta el 21-sep fallaban antes de enviar (error de JWT/reloj de Supabase, corregido y desplegado el 22-sep por la otra IA). Desde ese deploy fallan en `client.close().catch(...)`: en denomailer 1.6.0 `close()` puede no devolver una promesa, entonces el `.catch` revienta y además TAPA el error real de `send()`, si lo hubo. La prueba automática no lo detectó porque simulaba close() como promesa. Arreglado en local; falta desplegar las 2 funciones (requiere visto bueno). Después del deploy sabremos si Gmail acepta el envío: si la clave de aplicación de Gmail fue revocada, ahora el log lo va a mostrar.
- El SDK de Supabase ya reintenta solo (4 llamadas en ~7s por consulta). Se desactivó para esta consulta, para que el botón Reintentar responda en ~4s y no se hagan 12 llamadas.
- "No hay cuentas configuradas" (la carga funciona pero la lista está vacía) NO muestra aviso: solo avisa si la carga falló.
- Tarea 2 NO ejecutada: la CLI está linkeada pero sin sesión; hace falta que el usuario corra `npx supabase login`. Comandos propuestos: `npx supabase migration repair --status applied 0022 0023 0024` y luego `npx supabase migration list`.
- Tarea 3 NO aplicada. Propuesta de bajo riesgo: una migración que quita EXECUTE a anon (y a PUBLIC) sobre asignar_folios, y a anon/authenticated/PUBLIC sobre siguiente_folio y rls_auto_enable. Borrar las tablas legado vacías (imei_serie, jobs, services, technicians) y mover unaccent quedan solo como propuesta. La protección de contraseñas filtradas no está disponible en el plan Free.

### Estado final
- Tests/build: `tsc` limpio, `npm run lint` sin errores, `npm run build` OK, `node --test` 15/15 (garantía 5 + correos 10). Flujos de WhatsApp probados en navegador con API simulada.
- Git: 6 archivos modificados sin commit (+ este log). Nada subido, nada desplegado, ningún cambio en la base de datos.
---

---
## [2026-09-23 01:23] Migraciones registradas, permisos de funciones de folio y deploy de correos (aprobado por el usuario)

### Instrucción recibida
El usuario hizo `npx supabase login` y aprobó: (1) registrar 0022/0023/0024, (2) crear y aplicar la "0025" que quita permisos a las funciones de folio, (3) desplegar las 2 funciones de correo. NO hacer push hasta que pruebe en localhost el link de pago. Las 4 tablas legado vacías se quedan por ahora (se ven en el refactor del fin de semana). Al terminar: bitácora para Claude del chat.

### Comandos ejecutados (todos, en orden)
- Supabase `list_edge_functions` → weekly-report v8 y alertas-pendientes v10, ambas con verify_jwt=false (hay que mantenerlo para que el cron funcione).
- `npx supabase migration list` → 0022/0023/0024 solo en local; el resto coincide.
- `npx supabase migration repair --status applied 0022 0023 0024` → "Repaired migration history: [0022 0023 0024] => applied" (no ejecuta SQL, solo anota en el historial).
- `npx supabase migration list` → 0001…0024 y 20260922125047 coinciden en local y remoto.
- `npx supabase migration new quita_permisos_publicos_funciones_folio` → creó `20260923042133_quita_permisos_publicos_funciones_folio.sql` (se usó nombre con fecha porque "0025" ordenaría antes de 20260922125047 y el push fallaría).
- Write de la migración: revoke EXECUTE de asignar_folios a anon/public; de siguiente_folio y rls_auto_enable a anon/authenticated/public.
- `npx supabase db push --dry-run` → solo esa migración pendiente.
- `echo y | npx supabase db push` → "Applying migration 20260923042133_…" OK.
- Supabase `execute_sql` has_function_privilege → anon: nada; authenticated: solo asignar_folios.
- Supabase `execute_sql` en transacción con rollback, `set local role authenticated`, asignar_folios → devuelve folio (la app sigue funcionando); nada persistido.
- Supabase `execute_sql` con rol anon → rechazado; contador de prueba ZZTEST = 0 filas (nada quedó guardado).
- Supabase `execute_sql` en transacción con rollback: create table de prueba → RLS se activó automáticamente (el event trigger ensure_rls sigue funcionando).
- `npx supabase functions deploy weekly-report alertas-pendientes --no-verify-jwt --use-api` → desplegadas (salida con ref del proyecto enmascarada).
- Supabase `list_edge_functions` + `get_edge_function alertas-pendientes` → weekly-report v9 y alertas-pendientes v11, verify_jwt=false, código nuevo con try/catch en close().
- `curl -X POST` a ambas funciones sin secreto (ref leído de supabase/.temp, sin imprimirlo) → HTTP 401 "No autorizado" en ambas (arrancan bien, no envían nada).
- Supabase `get_advisors security` → desaparecieron los 5 avisos de funciones ejecutables sin login; queda solo asignar_folios para authenticated (intencional).
- `curl` al dev server → 200; `date` → 2026-09-23 01:23; `git status --short`.

### Archivos tocados (todos)
- `supabase/migrations/20260923042133_quita_permisos_publicos_funciones_folio.sql` — creado y aplicado en producción — quita EXECUTE público a las funciones de folio y a rls_auto_enable.
- `PROGRESS_LOG.md` — modificado — esta entrada.
- (Producción) historial de migraciones: 0022/0023/0024 marcadas como aplicadas.
- (Producción) edge functions weekly-report v9 y alertas-pendientes v11 desplegadas desde el working tree local (código aún sin commit).

### Hallazgos y decisiones
- Las funciones desplegadas vienen de archivos todavía sin commit en git: hay que commitearlos junto con la Tarea 1 cuando el usuario dé el visto bueno, para que GitHub y producción queden iguales.
- No se mandó un correo de prueba (no fue pedido). La confirmación real es esta noche a las 22:00 (resumen diario, solo si hay pendientes) y el lunes 09:00 UTC (reporte semanal). Si falla, el log ahora mostrará el error real de Gmail en vez del error de close().
- Tablas legado vacías (imei_serie, jobs, services, technicians) y unaccent sin tocar, por decisión del usuario.
- Protección de contraseñas filtradas: no disponible en el plan Free.

### Estado final
- Tests/build: sin cambios de código en esta ronda (siguen 15/15, build y lint OK de la ronda anterior). Verificaciones en producción OK (permisos, folios, RLS automático, funciones 401).
- Git: 6 archivos modificados + 1 migración nueva sin trackear + este log; nada commiteado ni pusheado (esperando la prueba del usuario en localhost).
---

---
## [2026-09-23 01:55] Publicación: link de pago, arreglo de correos y permisos de folio

### Instrucción recibida
El usuario probó en localhost el link de pago y los folios ("todo funciona"). Pidió commit y push a main, confirmar el deploy de Vercel y dejar git limpio y sincronizado con GitHub.

### Comandos ejecutados (todos, en orden)
- `git status --short` + `git diff --stat` → 7 archivos modificados + 1 migración sin trackear.
- `npx tsc --noEmit -p tsconfig.app.json` → OK; `npm run lint` → sin errores; `npm run build` → OK; `node --test` garantía + correos → 15/15.
- `git add -N` de la migración + `git diff | grep -cE "<ref del proyecto>|sbp_|service_role_key|eyJhbGci"` → 0 coincidencias (sin secretos ni ID del proyecto en el diff).
- `git add` de los 8 archivos, uno por uno → staged; `git status --short` → solo esos 8.
- `git commit` → `6656ad3` "Link de pago confiable en WhatsApp, arreglo de correos y permisos de folio".
- `git push origin main` → `69d7b68..6656ad3`.
- Espera con `curl` a la GitHub status API del commit 6656ad3 → Vercel "success" / "Deployment has completed".
- `date` → 2026-09-23 01:55.
- Edit de PROGRESS_LOG.md (esta entrada) → luego `git add PROGRESS_LOG.md`, `git commit`, `git push origin main`, `git fetch` + `git status` + `git rev-list --left-right --count HEAD...origin/main` (resultado en la respuesta final al usuario).

### Archivos tocados (todos)
- `PROGRESS_LOG.md` — modificado — esta entrada (en commit documental aparte).
- Commit `6656ad3`: `PROGRESS_LOG.md`, `src/components/dashboard/Dashboard.tsx`, `src/components/dashboard/components/ConfirmSheet.tsx`, `src/hooks/useCuentasBancarias.ts`, `supabase/functions/_shared/consultasCorreo.test.mjs`, `supabase/functions/alertas-pendientes/index.ts`, `supabase/functions/weekly-report/index.ts`, `supabase/migrations/20260923042133_quita_permisos_publicos_funciones_folio.sql` (detalle en las 2 entradas anteriores).

### Hallazgos y decisiones
- GitHub quedó igual a producción: las edge functions (v9/v11) y la migración ya aplicada ahora están en git.
- Queda pendiente confirmar que los correos llegan de verdad (22:00 Chile el resumen diario; lunes 06:00 Chile el semanal).

### Estado final
- Tests/build: tsc, lint y build OK; 15/15 tests. Vercel success para 6656ad3.
- Git: commit funcional 6656ad3 en origin/main; esta entrada va en un commit documental de cierre.
---
