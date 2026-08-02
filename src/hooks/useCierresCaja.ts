import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import type { CierreGuardado } from '../lib/cierreCaja';

export function useCierresCaja() {
  const [cierresList, setCierresList] = useState<CierreGuardado[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchCierres = useCallback(async () => {
    const { data, error } = await supabase
      .from('cierres_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(60);
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setCierresList((data || []) as unknown as CierreGuardado[]);
    }
  }, []);

  return { cierresList, error, fetchCierres };
}
