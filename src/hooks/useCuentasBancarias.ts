import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import type { CuentaBancaria } from '../types';

// 3 intentos en total: espera 1s antes del 2º y 3s antes del 3º.
const ESPERAS_ENTRE_INTENTOS_MS = [1000, 3000];

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useCuentasBancarias() {
  const [cuentasList, setCuentasList] = useState<CuentaBancaria[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Ref (no solo estado) porque el envío de WhatsApp puede ocurrir justo después de un
  // reintento exitoso, dentro de un closure creado antes de que el estado se re-renderice.
  const estadoRef = useRef({ cargadas: false, cantidad: 0 });

  const fetchCuentas = useCallback(async (): Promise<boolean> => {
    let ultimoError = 'Error desconocido';
    for (let intento = 0; intento <= ESPERAS_ENTRE_INTENTOS_MS.length; intento++) {
      if (intento > 0) await esperar(ESPERAS_ENTRE_INTENTOS_MS[intento - 1]);
      const { data, error } = await supabase
        .from('cuentas_bancarias')
        .select('id, banco, tipo_cuenta, numero_cuenta, titular, rut, email, orden')
        .order('orden', { ascending: true })
        // El SDK reintenta solo (4 llamadas, ~7s) — se apaga para que estos 3 intentos
        // sean los únicos y "Reintentar" responda en ~4s sin internet.
        .retry(false);
      if (!error) {
        const lista = data || [];
        estadoRef.current = { cargadas: true, cantidad: lista.length };
        setError(null);
        setCuentasList(lista);
        return true;
      }
      ultimoError = error.message;
    }
    setError(ultimoError);
    return false;
  }, []);

  useEffect(() => {
    const alVolverInternet = () => void fetchCuentas();
    const alVolverPestana = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void fetchCuentas();
    };
    window.addEventListener('online', alVolverInternet);
    document.addEventListener('visibilitychange', alVolverPestana);
    return () => {
      window.removeEventListener('online', alVolverInternet);
      document.removeEventListener('visibilitychange', alVolverPestana);
    };
  }, [fetchCuentas]);

  return { cuentasList, error, fetchCuentas, estadoCuentasRef: estadoRef };
}
