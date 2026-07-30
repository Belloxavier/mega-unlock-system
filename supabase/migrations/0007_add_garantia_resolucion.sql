-- Detalle de cómo se resolvió una garantía: nota de qué se hizo y, si
-- aplica, cuánto dinero se tuvo que devolver (flujo de caja negativo,
-- separado de la Caja normal).
alter table garantias add column if not exists nota_resolucion text;
alter table garantias add column if not exists monto_devuelto numeric;
