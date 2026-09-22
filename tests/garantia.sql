-- Ejecutar después de la migración. Solo usa una tabla temporal y hace rollback.
begin;
set local timezone = 'UTC';
create temporary table prueba_garantia (
  id int primary key,
  garantia_meses smallint not null default 3 check (garantia_meses in (0,1,3,6)),
  entregado_at timestamptz,
  garantia_vence_at timestamptz,
  nota text
);
-- Una fecha histórica no se debe reemplazar al guardar el mismo plazo.
insert into prueba_garantia values (99,3,'2026-01-01Z','2026-04-02Z',null);
create trigger prueba_garantia_trigger
before insert or update of entregado_at, garantia_meses on prueba_garantia
for each row execute function public.calcular_garantia_vence_at();

do $$
declare
  r record;
begin
  insert into prueba_garantia(id) values (1);
  if not exists(select 1 from prueba_garantia where id=1 and garantia_meses=3 and garantia_vence_at is null) then
    raise exception 'Default o inicio antes de entrega incorrecto';
  end if;
  insert into prueba_garantia(id, garantia_meses, entregado_at) values
    (2,0,'2026-01-31 12:00Z'),(3,1,'2026-01-31 12:00Z'),
    (4,3,'2026-01-31 12:00Z'),(5,6,'2026-01-31 12:00Z');
  for r in select * from (values
    (2,null::timestamptz),(3,'2026-02-28 12:00Z'::timestamptz),
    (4,'2026-04-30 12:00Z'::timestamptz),(5,'2026-07-31 12:00Z'::timestamptz)
  ) v(id, vence) loop
    if (select garantia_vence_at from prueba_garantia where id=r.id) is distinct from r.vence then
      raise exception 'Plazo incorrecto para caso %', r.id;
    end if;
  end loop;
  update prueba_garantia set garantia_meses=6 where id=3;
  if (select garantia_vence_at from prueba_garantia where id=3) <> '2026-07-31 12:00Z'::timestamptz then
    raise exception 'Edición no recalculó desde entrega original';
  end if;
  update prueba_garantia set garantia_meses=0 where id=3;
  if (select garantia_vence_at from prueba_garantia where id=3) is not null then
    raise exception 'Sin garantía conserva vencimiento';
  end if;
  update prueba_garantia set entregado_at=null where id=5;
  if (select garantia_vence_at from prueba_garantia where id=5) is not null then
    raise exception 'Reactivar conserva vencimiento';
  end if;
  update prueba_garantia set entregado_at='2026-02-01 12:00Z' where id=5;
  if (select garantia_vence_at from prueba_garantia where id=5) <> '2026-08-01 12:00Z'::timestamptz then
    raise exception 'Nueva entrega no conserva plazo';
  end if;
  update prueba_garantia set garantia_meses=3, nota='edición' where id=99;
  if (select garantia_vence_at from prueba_garantia where id=99) <> '2026-04-02Z'::timestamptz then
    raise exception 'Se alteró vencimiento histórico';
  end if;
  begin
    insert into prueba_garantia(id,garantia_meses) values (10,2);
    raise exception 'Se aceptó un plazo inválido';
  exception when check_violation then null;
  end;
end;
$$;
select 'PASS: default, cuatro plazos, fin de mes, edición, reactivación, históricos y validación' as resultado;
rollback;
