-- Los folios (F1, F2, I1...) se calculaban en el navegador mirando los
-- folios ya cargados en memoria (ver lib/folio.ts / handleGuardarServicio).
-- Con dos personas guardando casi al mismo tiempo desde equipos distintos,
-- ambas podían calcular el mismo número antes de que la otra terminara de
-- guardar, generando folios duplicados. Esta migración mueve la asignación
-- al servidor: cada folio se obtiene con un UPDATE atómico sobre una sola
-- fila de contador, que Postgres serializa solo con bloqueo de esa fila
-- (sin afectar al resto de la tabla ni de la app).

create table if not exists folio_contadores (
  prefijo text primary key,
  valor integer not null default 0
);

-- RLS habilitado sin políticas: la tabla no se expone directamente por
-- PostgREST, solo se accede a través de la función `asignar_folios`
-- (security definer, más abajo).
alter table folio_contadores enable row level security;

-- Arranca cada contador en el máximo folio ya usado para ese prefijo, para
-- que el primer folio nuevo continúe la numeración existente en vez de
-- repetirla.
insert into folio_contadores (prefijo, valor)
select
  substring(folio from '^[A-Za-z]+') as prefijo,
  max(substring(folio from '[0-9]+$')::integer) as valor
from servicios
where folio ~ '^[A-Za-z]+[0-9]+$'
group by substring(folio from '^[A-Za-z]+')
on conflict (prefijo) do update set valor = greatest(folio_contadores.valor, excluded.valor);

-- Asigna el siguiente folio para un prefijo. El UPSERT con
-- "on conflict ... do update" toma un lock de fila hasta que la transacción
-- termina, así que dos llamadas concurrentes para el mismo prefijo quedan
-- serializadas por Postgres en vez de leer el mismo valor.
create or replace function siguiente_folio(p_prefijo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valor integer;
begin
  insert into folio_contadores (prefijo, valor)
  values (p_prefijo, 1)
  on conflict (prefijo) do update set valor = folio_contadores.valor + 1
  returning valor into v_valor;
  return p_prefijo || v_valor;
end;
$$;

-- Asigna varios folios en una sola llamada (alta de varios equipos del
-- mismo cliente en un solo envío), respetando el orden del arreglo de
-- entrada para que cada fila del lote reciba su folio correspondiente.
create or replace function asignar_folios(p_prefijos text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado text[] := '{}';
  p text;
begin
  foreach p in array p_prefijos loop
    resultado := array_append(resultado, siguiente_folio(p));
  end loop;
  return resultado;
end;
$$;

revoke all on function siguiente_folio(text) from public;
revoke all on function asignar_folios(text[]) from public;
grant execute on function asignar_folios(text[]) to authenticated;
