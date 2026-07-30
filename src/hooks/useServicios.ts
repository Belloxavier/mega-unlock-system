import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import type { Servicio } from '../types';

// Centraliza el estado + fetch de `servicios` (antes vivía directo dentro
// de Dashboard.tsx). Las mutaciones (insert/update/delete) siguen en los
// handlers de Dashboard, que llaman a `fetchServicios()` para refrescar.
export function useServicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServicios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('servicios')
      .select(`*, clientes ( id, nombre, telefono, tipo_contacto )`)
      .order('created_at', { ascending: false });

    if (!error && data) setServicios(data);
    setLoading(false);
  }, []);

  return { servicios, loading, fetchServicios };
}
