// Estado de la garantía automática de 3 meses (garantia_vence_at, que se
// calcula solo en la base de datos vía trigger a partir de entregado_at —
// ver 0024_garantia_vence_at.sql). Puramente informativo, no toca la tabla
// `garantias` (esa es para reclamos, otra cosa).
import { ZONA_HORARIA } from './date';

export interface EstadoGarantia {
  vigente: boolean;
  /** Días restantes (redondeado hacia arriba) — negativo o 0 si ya venció, pero no se usa para "vencida". */
  diasRestantes: number;
  /** Fecha de vencimiento legible, ej. "02 dic 2026". */
  fechaFormateada: string;
}

/** null = todavía no se entrega el equipo (garantia_vence_at es null), no corresponde mostrar nada. */
export function calcularEstadoGarantia(garantiaVenceAt: string | null | undefined): EstadoGarantia | null {
  if (!garantiaVenceAt) return null;
  const vence = new Date(garantiaVenceAt);
  const diasRestantes = Math.ceil((vence.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const fechaFormateada = vence.toLocaleDateString('es-CL', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return { vigente: diasRestantes >= 0, diasRestantes, fechaFormateada };
}
