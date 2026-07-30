import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import type { Garantia } from '../types';

export function useGarantias() {
  const [garantiasList, setGarantiasList] = useState<Garantia[]>([]);

  const fetchGarantias = useCallback(async () => {
    const { data, error } = await supabase
      .from('garantias')
      .select(
        'id, folio, descripcion, created_at, resuelta, resuelta_at, nota_resolucion, monto_devuelto, servicios ( id, modelo_equipo, tipo_trabajo, cliente_id, clientes ( id, nombre, telefono ) )'
      )
      .order('created_at', { ascending: false });
    if (!error && data) setGarantiasList(data as unknown as Garantia[]);
  }, []);

  return { garantiasList, fetchGarantias };
}
