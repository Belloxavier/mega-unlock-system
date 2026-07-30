-- Cuentas bancarias que se muestran en la página pública /pago (enlazada
-- desde el WhatsApp de "equipo listo"). Lectura pública (sin login, para
-- que el cliente la abra directo) y escritura solo para el dueño logueado.
create table if not exists cuentas_bancarias (
  id uuid primary key default gen_random_uuid(),
  banco text not null,
  tipo_cuenta text not null,
  numero_cuenta text not null,
  titular text not null,
  rut text,
  email text,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

alter table cuentas_bancarias enable row level security;

create policy "Cualquiera puede leer cuentas bancarias"
  on cuentas_bancarias for select
  to anon, authenticated
  using (true);

create policy "Usuarios autenticados administran cuentas bancarias (insert)"
  on cuentas_bancarias for insert
  to authenticated
  with check (true);

create policy "Usuarios autenticados administran cuentas bancarias (update)"
  on cuentas_bancarias for update
  to authenticated
  using (true);

create policy "Usuarios autenticados administran cuentas bancarias (delete)"
  on cuentas_bancarias for delete
  to authenticated
  using (true);
