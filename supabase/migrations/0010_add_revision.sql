-- Permite registrar un trabajo como "revisión" sin monto todavía (se define
-- recién cuando se termina de diagnosticar). `diagnostico` guarda qué se
-- encontró/hizo, para avisarle al cliente junto con el precio final.
alter table servicios add column if not exists es_revision boolean not null default false;
alter table servicios add column if not exists diagnostico text;
