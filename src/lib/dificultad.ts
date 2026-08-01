import type { Servicio } from '../types';
import { claveCombo } from './normalizarTexto';

export type NivelDificultad = 'rapido' | 'medio' | 'largo';

export interface EstimacionDificultad {
  nivel: NivelDificultad;
  /** Mediana de los tiempos reales limpios (sin outliers) para esa combinación. */
  tiempoTipicoMinutos: number;
  muestras: number;
}

export type IndiceDuraciones = Map<string, number[]>;

// Mínimo de trabajos terminados (con inicio_real y fin_real, ya filtrados
// de outliers) para esa combinación antes de animarse a clasificar — con
// menos, se marca como "aprendiendo" en vez de adivinar con poca data.
export const MIN_MUESTRAS_DIFICULTAD = 3;

// Un tiempo por debajo del 20% o por encima del 500% del promedio bruto de
// su combinación es estadísticamente sospechoso (ej. alguien dejó el reloj
// corriendo toda la noche, o marcó "Finalizar" sin querer al segundo). Se
// excluye del cálculo de aprendizaje, pero el dato crudo queda igual en la
// base de datos — nada se pierde, solo no contamina el promedio/mediana.
const OUTLIER_RATIO_MIN = 0.2;
const OUTLIER_RATIO_MAX = 5;

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 !== 0
    ? ordenados[mitad]
    : (ordenados[mitad - 1] + ordenados[mitad]) / 2;
}

export function construirIndiceDuraciones(servicios: Servicio[]): IndiceDuraciones {
  const crudo: Map<string, number[]> = new Map();
  servicios.forEach((s) => {
    if (!s.inicio_real || !s.fin_real) return;
    if (s.tiempo_valido === false) return; // excluido a mano (dato conocido como malo)
    const minutos = (new Date(s.fin_real).getTime() - new Date(s.inicio_real).getTime()) / 60000;
    if (!(minutos > 0)) return;
    const key = claveCombo(s.modelo_equipo, s.tipo_trabajo);
    const arr = crudo.get(key);
    if (arr) arr.push(minutos);
    else crudo.set(key, [minutos]);
  });

  const idx: IndiceDuraciones = new Map();
  crudo.forEach((duraciones, key) => {
    const promedioBruto = duraciones.reduce((a, b) => a + b, 0) / duraciones.length;
    const limpio = duraciones.filter(
      (d) => d >= promedioBruto * OUTLIER_RATIO_MIN && d <= promedioBruto * OUTLIER_RATIO_MAX
    );
    // Si por algún motivo el filtro dejara todo afuera, mejor usar los
    // datos crudos que quedarse sin nada.
    idx.set(key, limpio.length > 0 ? limpio : duraciones);
  });

  return idx;
}

export function clasificarDuracion(minutos: number): NivelDificultad {
  if (minutos <= 15) return 'rapido';
  if (minutos <= 60) return 'medio';
  return 'largo';
}

export function estimarDificultad(
  indice: IndiceDuraciones,
  modelo: string,
  tipoTrabajo: string
): EstimacionDificultad | null {
  if (!modelo.trim() || !tipoTrabajo.trim()) return null;
  const muestras = indice.get(claveCombo(modelo, tipoTrabajo));
  if (!muestras || muestras.length < MIN_MUESTRAS_DIFICULTAD) return null;
  const tiempoTipicoMinutos = mediana(muestras);
  return { nivel: clasificarDuracion(tiempoTipicoMinutos), tiempoTipicoMinutos, muestras: muestras.length };
}

export const ETIQUETA_DIFICULTAD: Record<NivelDificultad, { icono: string; texto: string }> = {
  rapido: { icono: '🟢', texto: 'Rápido' },
  medio: { icono: '🟡', texto: 'Medio' },
  largo: { icono: '🔴', texto: 'Largo' },
};
