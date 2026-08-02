-- Normaliza el modelo del equipo (quita marca/prefijo y limpia espacios)
-- para que "Xiaomi Redmi 14C", "redmi 14c" y "14c" cuenten como el MISMO
-- modelo en precio sugerido, dificultad, carga del taller y rankings — hoy
-- se comparan como texto exacto, así que cualquier forma distinta de
-- escribir el mismo equipo rompía ese aprendizaje.
--
-- modelo_equipo (lo que escribió el usuario) no se toca — sigue
-- mostrándose tal cual en toda la pantalla. modelo_normalizado es un campo
-- aparte, solo para agrupar/aprender.
--
-- La función de acá abajo es una copia de la lógica de
-- lib/normalizarTexto.ts (normalizarModelo), usada SOLO para rellenar los
-- registros que ya existían antes de este cambio — se elimina al final de
-- la migración. De ahora en adelante, cada guardado/edición desde la app
-- calcula y guarda modelo_normalizado directamente, con la lógica vigente
-- en ese momento — si el diccionario de marcas cambia más adelante, los
-- registros viejos NO se reinterpretan solos, solo si se vuelven a guardar.

alter table servicios add column if not exists modelo_normalizado text;

create or replace function normalizar_modelo_temporal(valor text) returns text as $$
declare
  marcas text[] := array['xiaomi','redmi','samsung','galaxy','motorola','iphone','apple',
    'huawei','honor','realme','oppo','vivo','lg','nokia','sony','google','pixel',
    'oneplus','nothing','tecno','infinix'];
  base text;
  tokens text[];
  i int := 1;
  n int;
begin
  base := lower(coalesce(valor, ''));
  base := regexp_replace(base, '[^a-z0-9\s-]', ' ', 'g');
  base := regexp_replace(base, '-+', '-', 'g');
  base := regexp_replace(base, '\s+', ' ', 'g');
  base := trim(both ' -' from base);
  if base = '' then
    return '';
  end if;
  tokens := string_to_array(base, ' ');
  n := array_length(tokens, 1);
  while i < n and tokens[i] = any(marcas) loop
    i := i + 1;
  end loop;
  return array_to_string(tokens[i:n], ' ');
end;
$$ language plpgsql immutable;

update servicios
set modelo_normalizado = normalizar_modelo_temporal(modelo_equipo)
where modelo_normalizado is null;

drop function normalizar_modelo_temporal(text);

create index if not exists idx_servicios_modelo_normalizado_tipo on servicios (modelo_normalizado, tipo_trabajo);
