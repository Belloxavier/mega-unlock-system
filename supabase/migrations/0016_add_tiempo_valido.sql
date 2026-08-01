-- Permite excluir un tiempo real puntual del aprendizaje (precio sugerido,
-- dificultad, carga del taller) sin borrar el trabajo del historial — útil
-- si se detecta un dato malo (ej. se dejó el reloj corriendo por error)
-- después de que ya se guardó.
alter table servicios add column if not exists tiempo_valido boolean not null default true;
