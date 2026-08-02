import type { Servicio } from '../types';
import { claveCombo } from './normalizarTexto';

export interface SugerenciaPrecio {
  monto: number;
  frecuencia: number;
  total: number;
  pct: number;
}

export type IndicePrecios = Map<string, number[]>;

// Recorre todo el historial una vez (se memoiza en Dashboard con
// useMemo) y agrupa los montos cobrados por combinación modelo+servicio,
// para no tener que filtrar toda la lista en cada letra que se escribe.
export function construirIndicePrecios(servicios: Servicio[]): IndicePrecios {
  const idx: IndicePrecios = new Map();
  servicios.forEach((s) => {
    if (!s.monto || s.monto <= 0) return;
    // Se agrupa por modelo_normalizado (ya calculado y guardado al
    // registrar/editar el trabajo), no por el texto libre — así "Xiaomi
    // Redmi 14C" y "redmi 14c" cuentan como el mismo modelo.
    const key = claveCombo(s.modelo_normalizado || s.modelo_equipo, s.tipo_trabajo);
    const arr = idx.get(key);
    if (arr) arr.push(s.monto);
    else idx.set(key, [s.monto]);
  });
  return idx;
}

export function sugerirPrecio(
  indice: IndicePrecios,
  modelo: string,
  tipoTrabajo: string
): SugerenciaPrecio | null {
  if (!modelo.trim() || !tipoTrabajo.trim()) return null;
  const montos = indice.get(claveCombo(modelo, tipoTrabajo));
  if (!montos || montos.length === 0) return null;

  const conteo = new Map<number, number>();
  montos.forEach((m) => conteo.set(m, (conteo.get(m) || 0) + 1));

  let mejorMonto = montos[0];
  let mejorFrecuencia = 0;
  conteo.forEach((frecuencia, monto) => {
    if (frecuencia > mejorFrecuencia) {
      mejorFrecuencia = frecuencia;
      mejorMonto = monto;
    }
  });

  return {
    monto: mejorMonto,
    frecuencia: mejorFrecuencia,
    total: montos.length,
    pct: Math.round((mejorFrecuencia / montos.length) * 100),
  };
}
