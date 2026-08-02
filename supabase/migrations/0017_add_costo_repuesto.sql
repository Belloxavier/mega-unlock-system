-- Costo del repuesto/insumo usado en un trabajo (solo aplica a clientes
-- normales; a técnicos/mayoristas se les cobra solo instalación, así que
-- ese monto ya es neto y no corresponde este campo). Sirve para calcular
-- ganancia real en Finanzas: monto cobrado - costo_repuesto.
alter table servicios add column if not exists costo_repuesto numeric;
alter table servicios add constraint servicios_costo_repuesto_check
  check (costo_repuesto is null or costo_repuesto >= 0);
