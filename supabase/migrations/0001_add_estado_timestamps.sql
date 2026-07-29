-- Registra cuándo un servicio pasó a COMPLETADO y a ENTREGADO, para poder
-- calcular el tiempo promedio de reparación (Dashboard.tsx ya escribe estos
-- campos al cambiar el estado). Ejecutar en el SQL Editor de Supabase.

alter table servicios add column if not exists completado_at timestamptz;
alter table servicios add column if not exists entregado_at timestamptz;
