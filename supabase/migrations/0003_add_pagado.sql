-- Separa "pagado" del estado del trabajo: un trabajo puede cobrarse antes de
-- estar listo (adelanto) sin tener que marcarlo falsamente como COMPLETADO.
alter table servicios add column if not exists pagado boolean not null default false;
alter table servicios add column if not exists pagado_at timestamptz;

-- Backfill: los trabajos ya ENTREGADOS se asumen pagados (así funcionaba antes).
update servicios
set pagado = true,
    pagado_at = coalesce(entregado_at, created_at)
where estado = 'ENTREGADO' and pagado = false;
