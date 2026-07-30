-- Estado de verificación del IMEI contra las bases de las operadoras
-- (Subtel/Multibanda-SAE). Se marca a mano desde la pestaña Verificador
-- IMEI, no hay API pública para automatizarlo.
alter table servicios add column if not exists imei_estado text not null default 'sin_verificar';

-- Valores esperados: 'sin_verificar' | 'limpio' | 'reportado' | 'bloqueado'
alter table servicios drop constraint if exists servicios_imei_estado_check;
alter table servicios add constraint servicios_imei_estado_check
  check (imei_estado in ('sin_verificar', 'limpio', 'reportado', 'bloqueado'));
