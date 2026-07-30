import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import type { Cliente } from '../types';

export function useClientes() {
  const [clientesList, setClientesList] = useState<Cliente[]>([]);

  const fetchClientes = useCallback(async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, tipo_contacto')
      .order('nombre');
    if (!error && data) setClientesList(data);
  }, []);

  return { clientesList, fetchClientes };
}
