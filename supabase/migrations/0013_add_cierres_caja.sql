-- Historial de cierres de caja: un registro = un snapshot al momento de
-- "Guardar cierre" (upsert por fecha, un cierre "oficial" por día).

create table if not exists cierres_caja (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,                    -- día local del cierre (YYYY-MM-DD)
  cerrado_at timestamptz not null default now(),
  cobrado_total numeric(12,2) not null default 0,
  efectivo numeric(12,2) not null default 0,
  transferencia numeric(12,2) not null default 0,
  tarjeta numeric(12,2) not null default 0,
  otros_metodos numeric(12,2) not null default 0,
  n_cobros integer not null default 0,
  por_cobrar numeric(12,2) not null default 0,
  devuelto_garantias numeric(12,2) not null default 0,
  n_altas integer not null default 0,       -- trabajos creados ese día
  efectivo_contado numeric(12,2),          -- lo que contaron en caja (nullable)
  diferencia_efectivo numeric(12,2),       -- contado - sistema
  nota text,
  detalle jsonb                            -- lista compacta de cobros del día (opcional)
);

create index if not exists idx_cierres_caja_fecha on cierres_caja (fecha desc);

-- Un solo cierre "oficial" por día (si guardan de nuevo, se actualiza).
create unique index if not exists idx_cierres_caja_fecha_unique on cierres_caja (fecha);

alter table cierres_caja enable row level security;

-- Mismo patrón que el resto de las tablas del negocio (ver migración 0012):
-- solo usuarios autenticados, nada público. El upsert de "Guardar cierre"
-- necesita tanto insert como update (ON CONFLICT DO UPDATE).
create policy "Usuarios autenticados leen cierres_caja"
  on cierres_caja for select
  to authenticated
  using (true);

create policy "Usuarios autenticados crean cierres_caja"
  on cierres_caja for insert
  to authenticated
  with check (true);

create policy "Usuarios autenticados actualizan cierres_caja"
  on cierres_caja for update
  to authenticated
  using (true);

create policy "Usuarios autenticados eliminan cierres_caja"
  on cierres_caja for delete
  to authenticated
  using (true);
