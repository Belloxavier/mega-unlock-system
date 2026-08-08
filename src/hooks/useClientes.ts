import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import type { Cliente } from '../types';
import { escaparComodinesLike } from '../lib/postgrestFiltro';
import { normalizarNombre } from '../lib/normalizarTexto';

const SELECT_CLIENTE = 'id, nombre, telefono, tipo_contacto';

// A diferencia de useServicios/useGarantias, acá NO se mantiene una lista
// completa de clientes en memoria: lo único que el Dashboard necesita de
// esta tabla es (a) sugerencias de nombre mientras se escribe y (b) saber
// si ya existe un cliente con ese nombre exacto al guardar — ambas cosas
// son búsquedas acotadas, no un listado. Con 100.000 clientes, traer la
// tabla completa para filtrarla en el navegador (como se hacía antes) es
// justamente el patrón que no escala.
export function useClientes() {
  const [error, setError] = useState<string | null>(null);

  // Busca por nombre_normalizado (sin acentos, minúsculas) en vez de
  // `nombre` crudo — así "maria" encuentra "María" y viceversa. ILIKE de
  // Postgres no quita tildes solo, por eso se compara contra la columna ya
  // normalizada en vez de confiar en el ILIKE de `nombre`.
  const buscarClientes = useCallback(async (query: string, limite = 6): Promise<Cliente[]> => {
    const q = query.trim();
    if (!q) return [];
    const patron = `%${escaparComodinesLike(normalizarNombre(q))}%`;
    const { data, error } = await supabase
      .from('clientes')
      .select(SELECT_CLIENTE)
      .ilike('nombre_normalizado', patron)
      .order('nombre')
      .limit(limite);
    if (error) {
      setError(error.message);
      return [];
    }
    setError(null);
    return data || [];
  }, []);

  // Coincidencia exacta por nombre_normalizado — reemplaza el antiguo
  // `clientesList.find(...)` en memoria al crear/editar un trabajo. Antes
  // usaba ILIKE sobre `nombre` crudo, así que "maria jose" no encontraba a
  // "María José" ya existente y creaba un cliente duplicado.
  const buscarClientePorNombreExacto = useCallback(async (nombre: string): Promise<Cliente | null> => {
    const n = normalizarNombre(nombre);
    if (!n) return null;
    const { data, error } = await supabase
      .from('clientes')
      .select(SELECT_CLIENTE)
      .eq('nombre_normalizado', n)
      .limit(1)
      .maybeSingle();
    if (error) {
      setError(error.message);
      return null;
    }
    setError(null);
    return data;
  }, []);

  return { error, buscarClientes, buscarClientePorNombreExacto };
}
