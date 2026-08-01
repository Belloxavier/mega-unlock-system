-- Nota libre por trabajo (ej. "xiaomi 14c imei pero antes respaldar
-- contactos") — se ve en el formulario al crear/editar y en el historial.
alter table servicios add column if not exists nota text;
