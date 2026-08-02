-- Fase 1 de la auditoría de escalabilidad: índices para las columnas que
-- ya se usan para filtrar/ordenar (Dashboard, los dos Edge Functions) y que
-- hoy no tienen ninguno — sin esto, cada filtro degrada a un recorrido
-- secuencial completo a medida que crece la tabla. No se toca RLS ni el
-- modelo de datos todavía (fase futura).

create index if not exists idx_servicios_estado on servicios (estado);
create index if not exists idx_servicios_created_at on servicios (created_at desc);
create index if not exists idx_servicios_completado_at on servicios (completado_at desc);
create index if not exists idx_servicios_pagado_pagado_at on servicios (pagado, pagado_at);
create index if not exists idx_servicios_folio on servicios (folio);
create index if not exists idx_servicios_cliente_id on servicios (cliente_id);

create index if not exists idx_garantias_servicio_id on garantias (servicio_id);
create index if not exists idx_garantias_resuelta on garantias (resuelta);
create index if not exists idx_garantias_created_at on garantias (created_at desc);

-- UNIQUE en servicios.folio: el folio es el identificador que ve el
-- cliente y hoy su unicidad depende solo de que asignar_folios() (ver
-- 0011_folio_atomico.sql) sea el único camino de escritura — nada a nivel
-- de base de datos impide un duplicado si algo más escribe folio alguna
-- vez. Si YA existieran folios duplicados históricos, no hay forma segura
-- de adivinar automáticamente cuál de las filas es la "incorrecta" — en
-- vez de fallar toda la migración o inventar una corrección, se detecta
-- primero y la restricción solo se aplica si no hay duplicados. Si los
-- hay, queda un aviso (NOTICE) y no se aplica, para revisarlos a mano.
do $$
declare
  n_duplicados integer;
begin
  select count(*) into n_duplicados
  from (
    select folio from servicios where folio is not null group by folio having count(*) > 1
  ) dup;

  if n_duplicados > 0 then
    raise notice 'servicios.folio: % folio(s) duplicado(s) encontrados — NO se aplicó la restricción UNIQUE. Revisa esas filas a mano y vuelve a correr esta migración (o el ALTER TABLE de abajo a mano) después.', n_duplicados;
  else
    alter table servicios add constraint servicios_folio_unique unique (folio);
  end if;
end $$;
