// Estado de la garantía elegida por equipo (garantia_vence_at, que se
// calcula solo en la base de datos vía trigger a partir de entregado_at —
// ver la migración garantia_meses_por_equipo). Puramente informativo, no toca la tabla
// `garantias` (esa es para reclamos, otra cosa).
import { ZONA_HORARIA } from './date';

export interface EstadoGarantia {
  vigente: boolean;
  /** Días restantes (redondeado hacia arriba) — negativo o 0 si ya venció, pero no se usa para "vencida". */
  diasRestantes: number;
  /** Fecha de vencimiento legible, ej. "02 dic 2026". */
  fechaFormateada: string;
}

/** Tipos de servicio que arrancan en "Sin garantía" hasta que el usuario elija otra cosa a mano.
 * FRP: quitar la cuenta Google no obliga al taller si el cliente pierde luego su propia clave.
 * Instalación de repuesto de terceros: el repuesto no lo vendió el taller, solo la mano de obra. */
const SIN_GARANTIA_POR_DEFECTO = new Set(['FRP', 'Instalación de repuesto de terceros']);

export function garantiaPorDefecto(tipoTrabajo: string): 0 | 1 | 3 | 6 {
  return SIN_GARANTIA_POR_DEFECTO.has(tipoTrabajo) ? 0 : 3;
}

/** null = sin fecha calculable. El llamador distingue plazo 0 de fecha desconocida. */
export function calcularEstadoGarantia(garantiaVenceAt: string | null | undefined): EstadoGarantia | null {
  if (!garantiaVenceAt) return null;
  const vence = new Date(garantiaVenceAt);
  if (!Number.isFinite(vence.getTime())) return null;
  const diferenciaMs = vence.getTime() - Date.now();
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
  const fechaFormateada = vence.toLocaleDateString('es-CL', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return { vigente: diferenciaMs > 0, diasRestantes, fechaFormateada };
}
