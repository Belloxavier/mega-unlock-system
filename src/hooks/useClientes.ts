import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import type { Cliente } from '../types';
import { escaparComodinesLike } from '../lib/postgrestFiltro';

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

  const buscarClientes = useCallback(async (query: string, limite = 6): Promise<Cliente[]> => {
    const q = query.trim();
    if (!q) return [];
    const patron = `%${escaparComodinesLike(q)}%`;
    const { data, error } = await supabase
      .from('clientes')
      .select(SELECT_CLIENTE)
      .ilike('nombre', patron)
      .order('nombre')
      .limit(limite);
    if (error) {
      setError(error.message);
      return [];
    }
    setError(null);
    return data || [];
  }, []);

  // Coincidencia exacta (sin distinguir mayúsculas) — reemplaza el antiguo
  // `clientesList.find(...)` en memoria al crear/editar un trabajo.
  const buscarClientePorNombreExacto = useCallback(async (nombre: string): Promise<Cliente | null> => {
    const n = nombre.trim();
    if (!n) return null;
    const { data, error } = await supabase
      .from('clientes')
      .select(SELECT_CLIENTE)
      .ilike('nombre', escaparComodinesLike(n))
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
