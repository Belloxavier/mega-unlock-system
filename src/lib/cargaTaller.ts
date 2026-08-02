import type { Servicio } from '../types';
import { construirIndiceDuraciones, estimarDificultad } from './dificultad';

export type NivelCarga = 'baja' | 'media' | 'alta';

export interface CargaTaller {
  horas: number;
  nivel: NivelCarga;
  trabajosPendientes: number;
}

const ESTADOS_EN_TALLER = ['PENDIENTE', 'EN PROCESO', 'COMPLETADO'];

// Semáforo de carga combinada (dos personas). Rangos de partida — son un
// punto de referencia razonable para un taller chico, ajustables si en la
// práctica no calzan con el ritmo real del negocio.
const LIMITE_BAJA_HORAS = 4;
const LIMITE_MEDIA_HORAS = 10;

/**
 * Suma el tiempo real promedio de cada trabajo aún en el taller. Si una
 * combinación modelo+servicio no tiene historial propio todavía, usa el
 * promedio global de todo lo medido como respaldo — así el número sigue
 * siendo útil desde el principio y se afina solo con más historial.
 * Devuelve null si todavía no hay ningún tiempo real registrado en el
 * sistema (nada de lo cual partir).
 */
export function calcularCargaTaller(servicios: Servicio[]): CargaTaller | null {
  const pendientes = servicios.filter((s) => ESTADOS_EN_TALLER.includes(s.estado));

  const indice = construirIndiceDuraciones(servicios);
  const todasLasMuestras = Array.from(indice.values()).flat();
  if (todasLasMuestras.length === 0) return null;

  const promedioGlobal = todasLasMuestras.reduce((a, b) => a + b, 0) / todasLasMuestras.length;

  const totalMinutos = pendientes.reduce((acc, s) => {
    const est = estimarDificultad(indice, s.modelo_normalizado || s.modelo_equipo, s.tipo_trabajo);
    return acc + (est ? est.tiempoTipicoMinutos : promedioGlobal);
  }, 0);

  const horas = totalMinutos / 60;
  const nivel: NivelCarga = horas <= LIMITE_BAJA_HORAS ? 'baja' : horas <= LIMITE_MEDIA_HORAS ? 'media' : 'alta';

  return { horas, nivel, trabajosPendientes: pendientes.length };
}

export const ETIQUETA_CARGA: Record<NivelCarga, string> = {
  baja: '🟢',
  media: '🟡',
  alta: '🔴',
};

export const ESTILO_CARGA: Record<NivelCarga, { titulo: string; valor: string; gradiente: string; borde: string }> = {
  baja: {
    titulo: 'text-emerald-400',
    valor: 'text-emerald-300',
    gradiente: 'from-slate-900/90 to-emerald-950/40',
    borde: 'border-emerald-500/30',
  },
  media: {
    titulo: 'text-amber-400',
    valor: 'text-amber-300',
    gradiente: 'from-slate-900/90 to-amber-950/40',
    borde: 'border-amber-500/30',
  },
  alta: {
    titulo: 'text-rose-400',
    valor: 'text-rose-300',
    gradiente: 'from-slate-900/90 to-rose-950/40',
    borde: 'border-rose-500/30',
  },
};
