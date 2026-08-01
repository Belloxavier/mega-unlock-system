-- Registro de tiempo real trabajado por equipo, independiente del estado
-- general (PENDIENTE/EN PROCESO/ENTREGADO). Es la fuente de verdad para
-- calcular precio sugerido, dificultad automática y carga del taller a
-- partir de datos reales en vez de created_at/completado_at, que no
-- reflejan cuándo se trabajó de verdad en el equipo.
alter table servicios add column if not exists inicio_real timestamptz;
alter table servicios add column if not exists fin_real timestamptz;
