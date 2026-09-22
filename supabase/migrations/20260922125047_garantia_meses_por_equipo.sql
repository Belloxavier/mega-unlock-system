-- Cada equipo conserva su plazo; no se recalculan vencimientos históricos.
alter table public.servicios
  add column garantia_meses smallint not null default 3
  constraint servicios_garantia_meses_check check (garantia_meses in (0, 1, 3, 6));

comment on column public.servicios.garantia_meses is
  'Plazo desde la entrega: 0 sin garantía, 1, 3 o 6 meses. Históricos: 3.';

create or replace function public.calcular_garantia_vence_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
set timezone = 'UTC'
as $$
begin
  -- Guardar una edición sin cambiar plazo/entrega conserva la fecha exacta
  -- anterior, incluso en históricos. Solo un cambio real recalcula.
  if TG_OP = 'UPDATE' then
    if new.entregado_at is not distinct from old.entregado_at
       and new.garantia_meses is not distinct from old.garantia_meses then
      return new;
    end if;
  end if;
  if new.entregado_at is null or new.garantia_meses = 0 then
    new.garantia_vence_at := null;
  else
    -- Conserva la semántica de meses calendario de la garantía anterior.
    new.garantia_vence_at := new.entregado_at + make_interval(months => new.garantia_meses);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_garantia_vence_at on public.servicios;
create trigger trg_garantia_vence_at
before insert or update of entregado_at, garantia_meses on public.servicios
for each row execute function public.calcular_garantia_vence_at();
