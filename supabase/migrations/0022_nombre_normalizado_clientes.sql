-- Normaliza el nombre del cliente (sin acentos, minúsculas) para que
-- "maria jose" y "María José" se reconozcan como la MISMA persona en
-- búsqueda y al detectar duplicados — hoy se comparan con ILIKE sobre el
-- nombre crudo, y ese ILIKE no quita tildes, así que cualquier variante con
-- distinto acento pasaba como cliente nuevo.
--
-- nombre (lo que escribió el usuario) no se toca — sigue mostrándose tal
-- cual en toda la pantalla. nombre_normalizado es un campo aparte, solo
-- para buscar/comparar. Mismo patrón que modelo_normalizado en servicios
-- (ver 0021_modelo_normalizado.sql).

create extension if not exists unaccent;

alter table clientes add column if not exists nombre_normalizado text;

update clientes
set nombre_normalizado = regexp_replace(trim(lower(unaccent(coalesce(nombre, '')))), '\s+', ' ', 'g')
where nombre_normalizado is null;

create index if not exists idx_clientes_nombre_normalizado on clientes (nombre_normalizado);
