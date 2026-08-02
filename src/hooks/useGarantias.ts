import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import type { Garantia } from '../types';

// Se mantiene sin paginar a propósito: GarantiasTab muestra el historial
// completo (no tiene controles de página) y el volumen de garantías es muy
// inferior al de servicios (solo una fracción de los trabajos termina en
// garantía) — paginar esto habría significado agregar UI de paginación a
// esa pestaña, fuera del alcance de esta fase. Si el volumen crece al punto
// de que esto duela, se revisita.
export function useGarantias() {
  const [garantiasList, setGarantiasList] = useState<Garantia[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchGarantias = useCallback(async () => {
    const { data, error } = await supabase
      .from('garantias')
      .select(
        'id, folio, descripcion, created_at, resuelta, resuelta_at, nota_resolucion, monto_devuelto, servicios ( id, modelo_equipo, tipo_trabajo, cliente_id, clientes ( id, nombre, telefono ) )'
      )
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setGarantiasList(data as unknown as Garantia[]);
    }
  }, []);

  return { garantiasList, error, fetchGarantias };
}
