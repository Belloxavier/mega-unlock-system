-- (Equivale a la "0025".) Sin login, cualquiera con la clave pública podía llamar
-- a las funciones de folio vía /rest/v1/rpc y "gastar" números. La 0011 hizo
-- `revoke ... from public`, pero Supabase además concede EXECUTE a anon/authenticated
-- directamente, así que no bastaba.
--
-- asignar_folios: la app la llama con sesión iniciada (authenticated) → se mantiene.
-- siguiente_folio: solo la llama asignar_folios, que corre como su dueño (SECURITY
--   DEFINER) → nadie más la necesita.
-- rls_auto_enable: función del event trigger `ensure_rls` de Supabase; el trigger
--   la sigue ejecutando igual, solo se quita la posibilidad de llamarla por la API.

revoke execute on function public.asignar_folios(text[]) from anon, public;
revoke execute on function public.siguiente_folio(text) from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
