import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import type { CuentaBancaria } from '../types';

export function useCuentasBancarias() {
  const [cuentasList, setCuentasList] = useState<CuentaBancaria[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchCuentas = useCallback(async () => {
    const { data, error } = await supabase
      .from('cuentas_bancarias')
      .select('id, banco, tipo_cuenta, numero_cuenta, titular, rut, email, orden')
      .order('orden', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setCuentasList(data || []);
    }
  }, []);

  return { cuentasList, error, fetchCuentas };
}
