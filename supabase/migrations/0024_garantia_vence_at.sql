-- Garantía automática de 3 meses por equipo entregado — nada que el
-- usuario tenga que registrar a mano, se calcula sola a partir de
-- entregado_at (que ya se guarda al marcar un trabajo como ENTREGADO).
--
-- Esto es SOLO información de consulta (badge en Historial/Área de
-- Trabajo). No toca la tabla `garantias` — esa sigue siendo para
-- reclamos/reparaciones bajo garantía, algo completamente distinto.

alter table servicios add column if not exists garantia_vence_at timestamptz;

-- Backfill retroactivo: TODOS los registros ya entregados desde el
-- primero hasta hoy, misma regla de 3 meses, sin excepción por fecha.
update servicios
set garantia_vence_at = entregado_at + interval '3 months'
where entregado_at is not null and garantia_vence_at is null;

-- De acá en adelante, automático: cada vez que entregado_at cambia (se
-- entrega un equipo, o se reactiva un trabajo y entregado_at vuelve a
-- null vía "Reactivar"), garantia_vence_at se recalcula solo en el mismo
-- UPDATE — no depende de que el código de la app se acuerde de tocarla.
create or replace function calcular_garantia_vence_at()
returns trigger
language plpgsql
as $$
begin
  if new.entregado_at is not null then
    new.garantia_vence_at := new.entregado_at + interval '3 months';
  else
    new.garantia_vence_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_garantia_vence_at on servicios;
create trigger trg_garantia_vence_at
before insert or update of entregado_at on servicios
for each row
execute function calcular_garantia_vence_at();
