-- Apartado de garantías: solo pide folio (para saber a qué trabajo se
-- refiere) y descripción del problema. Se enlaza al servicio por folio para
-- poder calcular, por cliente, cuántas garantías trae en el mes.
create table if not exists garantias (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid references servicios(id) on delete set null,
  folio text not null,
  descripcion text not null,
  created_at timestamptz not null default now()
);

alter table garantias enable row level security;

create policy "Usuarios autenticados leen garantias"
  on garantias for select
  to authenticated
  using (true);

create policy "Usuarios autenticados crean garantias"
  on garantias for insert
  to authenticated
  with check (true);

create policy "Usuarios autenticados eliminan garantias"
  on garantias for delete
  to authenticated
  using (true);
