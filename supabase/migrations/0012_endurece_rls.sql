-- Endurece RLS en clientes y servicios: ambas tablas son anteriores a las
-- migraciones de este proyecto y quedaron con una sola política heredada
-- ("Acceso total a ...", FOR ALL TO public USING (true)) que permite leer y
-- escribir sin necesidad de login — cualquiera con la URL/clave pública del
-- proyecto podía ver o modificar nombres, teléfonos, montos e IMEI de
-- clientes reales. Se reemplaza por 4 políticas explícitas restringidas a
-- authenticated, igual al patrón que ya usan garantias y cuentas_bancarias.
drop policy if exists "Acceso total a clientes" on clientes;

create policy "Usuarios autenticados leen clientes"
  on clientes for select
  to authenticated
  using (true);

create policy "Usuarios autenticados crean clientes"
  on clientes for insert
  to authenticated
  with check (true);

create policy "Usuarios autenticados actualizan clientes"
  on clientes for update
  to authenticated
  using (true);

create policy "Usuarios autenticados eliminan clientes"
  on clientes for delete
  to authenticated
  using (true);

drop policy if exists "Acceso total a servicios" on servicios;

create policy "Usuarios autenticados leen servicios"
  on servicios for select
  to authenticated
  using (true);

create policy "Usuarios autenticados crean servicios"
  on servicios for insert
  to authenticated
  with check (true);

create policy "Usuarios autenticados actualizan servicios"
  on servicios for update
  to authenticated
  using (true);

create policy "Usuarios autenticados eliminan servicios"
  on servicios for delete
  to authenticated
  using (true);

-- garantias nunca tuvo política de UPDATE — el Dashboard marca/desmarca una
-- garantía como resuelta con un .update(), que sin política queda denegado
-- por defecto bajo RLS. Se agrega, con el mismo alcance (authenticated) que
-- el resto de las políticas de esta tabla.
create policy "Usuarios autenticados actualizan garantias"
  on garantias for update
  to authenticated
  using (true);
