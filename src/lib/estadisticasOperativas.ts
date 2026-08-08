// Estadísticas operativas del taller: volumen y tipo de trabajo (nunca
// montos, eso lo cubren cierreCaja/reporteMensual), salvo la comparación
// semana/mes de más abajo, que mezcla trabajos+ingresos+pagos a pedido
// explícito (ver calcularComparacionSemana/Mes). Todo se deriva de
// `servicios` — nada que el usuario tenga que escribir a mano.
//
// El dinero SIEMPRE se contabiliza por fecha real de pago (fechaPagoIso:
// pagado_at editable, no created_at) — igual que cierreCaja/reporteMensual,
// para que un pago registrado días después siga cayendo en el día en que
// de verdad ocurrió.
import type { Servicio } from '../types';
import { getFechaLocal, getDiaSemana, DIAS_SEMANA } from './date';
import {
  inicioSemana,
  finSemana,
  inicioSemanaPasada,
  finSemanaPasada,
  inicioMes,
  finMes,
  inicioMesPasado,
  finMesPasado,
  estaEnRango,
} from './fechaFinanzas';
import { ESTADOS_PROGRESO } from './estado';
import { fechaPagoIso, ganancia } from './cierreCaja';

export interface ConteoItem {
  nombre: string;
  cantidad: number;
}

export interface SnapshotEstado {
  estado: string;
  cantidad: number;
}

export interface ResumenVolumen {
  hoy: number;
  semana: number;
  mes: number;
  total: number;
}

export interface MejorDia {
  fecha: string; // YYYY-MM-DD local
  cantidad: number;
}

export type Agrupacion = 'dia' | 'semana' | 'mes';

export interface PuntoSerie {
  etiqueta: string;
  cantidad: number;
}

/** Cuántos trabajos hay ahora mismo en cada estado (foto actual, no histórico). */
export function calcularSnapshotEstados(servicios: Servicio[]): SnapshotEstado[] {
  const conteo: { [estado: string]: number } = {};
  servicios.forEach((s) => {
    conteo[s.estado] = (conteo[s.estado] || 0) + 1;
  });
  const orden = [...ESTADOS_PROGRESO, 'NO REALIZADO'];
  return orden.map((estado) => ({ estado, cantidad: conteo[estado] || 0 }));
}

/** Trabajos dados de alta (created_at) hoy / esta semana / este mes / histórico total. */
export function calcularVolumen(servicios: Servicio[]): ResumenVolumen {
  const ahora = new Date();
  const hoyStr = getFechaLocal(ahora);
  const semIni = inicioSemana(ahora);
  const semFin = finSemana(ahora);
  const mesIni = inicioMes(ahora);
  const mesFin = finMes(ahora);
  return {
    hoy: servicios.filter((s) => getFechaLocal(s.created_at) === hoyStr).length,
    semana: servicios.filter((s) => estaEnRango(s.created_at, semIni, semFin)).length,
    mes: servicios.filter((s) => estaEnRango(s.created_at, mesIni, mesFin)).length,
    total: servicios.length,
  };
}

/** Día calendario (histórico) con más trabajos dados de alta. */
export function calcularMejorDiaHistorico(servicios: Servicio[]): MejorDia | null {
  if (servicios.length === 0) return null;
  const conteo: { [fecha: string]: number } = {};
  servicios.forEach((s) => {
    const f = getFechaLocal(s.created_at);
    conteo[f] = (conteo[f] || 0) + 1;
  });
  const [fecha, cantidad] = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
  return { fecha, cantidad };
}

/** Cuántos trabajos se han hecho históricamente en cada día de la semana (Lunes–Sábado). */
export function calcularPorDiaSemana(servicios: Servicio[]): ConteoItem[] {
  const conteo: { [dia: string]: number } = {};
  servicios.forEach((s) => {
    const dia = getDiaSemana(s.created_at);
    if (DIAS_SEMANA.includes(dia)) conteo[dia] = (conteo[dia] || 0) + 1;
  });
  return DIAS_SEMANA.map((dia) => ({ nombre: dia, cantidad: conteo[dia] || 0 }));
}

/** Ranking histórico de tipos de trabajo por cantidad (no por dinero). */
export function calcularPorTipoTrabajo(servicios: Servicio[], maxItems = 8): ConteoItem[] {
  const conteo: { [tipo: string]: number } = {};
  servicios.forEach((s) => {
    const t = s.tipo_trabajo || 'General';
    conteo[t] = (conteo[t] || 0) + 1;
  });
  return Object.entries(conteo)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, maxItems);
}

const CANTIDAD_PERIODOS: { [k in Agrupacion]: number } = { dia: 14, semana: 8, mes: 6 };

/** Serie cronológica de cantidad de trabajos, agrupada por día/semana/mes. */
export function calcularSerieAgrupada(servicios: Servicio[], modo: Agrupacion): PuntoSerie[] {
  const n = CANTIDAD_PERIODOS[modo];
  const ahora = new Date();

  if (modo === 'dia') {
    const puntos: PuntoSerie[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(ahora);
      d.setDate(d.getDate() - i);
      const fechaStr = getFechaLocal(d);
      const cantidad = servicios.filter((s) => getFechaLocal(s.created_at) === fechaStr).length;
      const [, m, dia] = fechaStr.split('-');
      puntos.push({ etiqueta: `${dia}/${m}`, cantidad });
    }
    return puntos;
  }

  if (modo === 'semana') {
    const puntos: PuntoSerie[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const ref = new Date(ahora);
      ref.setDate(ref.getDate() - i * 7);
      const ini = inicioSemana(ref);
      const fin = finSemana(ref);
      const cantidad = servicios.filter((s) => estaEnRango(s.created_at, ini, fin)).length;
      const etiqueta = `${String(ini.getDate()).padStart(2, '0')}/${String(ini.getMonth() + 1).padStart(2, '0')}`;
      puntos.push({ etiqueta, cantidad });
    }
    return puntos;
  }

  const puntos: PuntoSerie[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ref = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const ini = inicioMes(ref);
    const fin = finMes(ref);
    const cantidad = servicios.filter((s) => estaEnRango(s.created_at, ini, fin)).length;
    const etiqueta = ini.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
    puntos.push({ etiqueta, cantidad });
  }
  return puntos;
}

// ---------------------------------------------------------------------
// Comparación por período, vista semanal/mensual y reconstrucción diaria
// ---------------------------------------------------------------------

interface DiaDesglosado {
  fecha: string;
  trabajos: number;
  /** Ganancia neta (fecha real de pago) — 0 si nada se pagó ese día. */
  ingresos: number;
}

// Un mismo día puede aportar a `trabajos` (por created_at) y a `ingresos`
// (por fechaPagoIso) sin ser el mismo grupo de trabajos — un pago cobrado
// hoy puede ser de un trabajo creado la semana pasada. Por eso se acumulan
// por separado en el mismo bucket de fecha, no como "trabajos pagados".
function desglosePorDia(servicios: Servicio[], ini: Date, fin: Date): DiaDesglosado[] {
  const mapa = new Map<string, DiaDesglosado>();
  const fila = (fecha: string) => {
    let f = mapa.get(fecha);
    if (!f) {
      f = { fecha, trabajos: 0, ingresos: 0 };
      mapa.set(fecha, f);
    }
    return f;
  };
  servicios.forEach((s) => {
    if (estaEnRango(s.created_at, ini, fin)) {
      fila(getFechaLocal(s.created_at)).trabajos += 1;
    }
    if (s.pagado) {
      const fPago = fechaPagoIso(s);
      if (estaEnRango(fPago, ini, fin)) {
        fila(getFechaLocal(fPago)).ingresos += ganancia(s);
      }
    }
  });
  return Array.from(mapa.values());
}

// Días de calendario transcurridos dentro del rango, sin contar más allá
// de "ahora" — un período "actual" en curso (esta semana/mes) se compara
// por lo que ya transcurrió, no por su duración total todavía no cumplida.
function diasTranscurridosEnRango(ini: Date, fin: Date, ahora: Date): number {
  const finEfectivo = fin.getTime() < ahora.getTime() ? fin : ahora;
  const ms = finEfectivo.getTime() - ini.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

export interface DiaCantidad {
  fecha: string;
  cantidad: number;
}

export interface ComparacionPeriodo {
  dias: number;
  totalTrabajos: number;
  diasTrabajados: number;
  promedioPorDiaTrabajado: number;
  mejorDia: DiaCantidad | null;
  peorDia: DiaCantidad | null;
  totalAnterior: number;
  /** null si el período anterior no tiene datos (no hay base para comparar). */
  tendenciaPct: number | null;
}

/**
 * Compara los últimos `dias` días contra los `dias` inmediatamente
 * anteriores. "Trabajos" = dados de alta (created_at), igual que el resto
 * del módulo de volumen — el dinero no entra acá (ver
 * calcularComparacionSemana/Mes para eso).
 */
export function calcularComparacionPeriodo(servicios: Servicio[], dias: number): ComparacionPeriodo {
  const ahora = new Date();
  const finActual = ahora;
  const iniActual = new Date(ahora);
  iniActual.setDate(iniActual.getDate() - dias + 1);
  iniActual.setHours(0, 0, 0, 0);

  const finAnterior = new Date(iniActual.getTime() - 1); // último instante del día previo
  const iniAnterior = new Date(finAnterior);
  iniAnterior.setDate(iniAnterior.getDate() - dias + 1);
  iniAnterior.setHours(0, 0, 0, 0);

  const diasActivos = desglosePorDia(servicios, iniActual, finActual)
    .filter((d) => d.trabajos > 0)
    .sort((a, b) => b.trabajos - a.trabajos);

  const totalTrabajos = diasActivos.reduce((a, d) => a + d.trabajos, 0);
  const diasTrabajados = diasActivos.length;
  const mejorDia = diasActivos[0] ? { fecha: diasActivos[0].fecha, cantidad: diasActivos[0].trabajos } : null;

  // El día de hoy todavía no terminó — si hay más de un día activo en el
  // período, no cuenta como candidato a "peor día" para no castigar un día
  // a medio transcurrir. Si hoy es la única actividad del período, sí se usa
  // (mejor eso que no mostrar nada).
  const hoyStr = getFechaLocal(ahora);
  const diasCompletos = diasActivos.filter((d) => d.fecha !== hoyStr);
  const candidatosPeor = diasCompletos.length > 0 ? diasCompletos : diasActivos;
  const peorDiaRaw = candidatosPeor[candidatosPeor.length - 1];
  const peorDia = peorDiaRaw ? { fecha: peorDiaRaw.fecha, cantidad: peorDiaRaw.trabajos } : null;

  const totalAnterior = servicios.filter((s) => estaEnRango(s.created_at, iniAnterior, finAnterior)).length;
  const tendenciaPct = totalAnterior > 0 ? ((totalTrabajos - totalAnterior) / totalAnterior) * 100 : null;

  return {
    dias,
    totalTrabajos,
    diasTrabajados,
    promedioPorDiaTrabajado: diasTrabajados > 0 ? totalTrabajos / diasTrabajados : 0,
    mejorDia,
    peorDia,
    totalAnterior,
    tendenciaPct,
  };
}

export interface DetallePeriodoComparado {
  trabajos: number;
  /** Ganancia neta (fecha real de pago), no facturado bruto. */
  ingresos: number;
  /** Cantidad de cobros (trabajos pagados) en el rango. */
  pagos: number;
  promedioTrabajosPorDia: number;
  mejorDiaPorTrabajos: DiaCantidad | null;
  mejorDiaPorIngresos: { fecha: string; monto: number } | null;
}

export interface ComparacionSemanaMes {
  actual: DetallePeriodoComparado;
  anterior: DetallePeriodoComparado;
}

function calcularDetallePeriodo(
  servicios: Servicio[],
  ini: Date,
  fin: Date,
  ahora: Date
): DetallePeriodoComparado {
  const desglose = desglosePorDia(servicios, ini, fin);
  const trabajos = desglose.reduce((a, d) => a + d.trabajos, 0);
  const ingresos = desglose.reduce((a, d) => a + d.ingresos, 0);
  const pagos = servicios.filter((s) => s.pagado && estaEnRango(fechaPagoIso(s), ini, fin)).length;
  const dias = diasTranscurridosEnRango(ini, fin, ahora);

  const porTrabajos = [...desglose].filter((d) => d.trabajos > 0).sort((a, b) => b.trabajos - a.trabajos)[0];
  const porIngresos = [...desglose].filter((d) => d.ingresos > 0).sort((a, b) => b.ingresos - a.ingresos)[0];

  return {
    trabajos,
    ingresos,
    pagos,
    promedioTrabajosPorDia: trabajos / dias,
    mejorDiaPorTrabajos: porTrabajos ? { fecha: porTrabajos.fecha, cantidad: porTrabajos.trabajos } : null,
    mejorDiaPorIngresos: porIngresos ? { fecha: porIngresos.fecha, monto: porIngresos.ingresos } : null,
  };
}

/** Semana actual (lunes–hoy o lunes–domingo si ya terminó) vs. semana anterior completa. */
export function calcularComparacionSemana(servicios: Servicio[]): ComparacionSemanaMes {
  const ahora = new Date();
  return {
    actual: calcularDetallePeriodo(servicios, inicioSemana(ahora), finSemana(ahora), ahora),
    anterior: calcularDetallePeriodo(servicios, inicioSemanaPasada(ahora), finSemanaPasada(ahora), ahora),
  };
}

/** Mes actual (día 1–hoy o completo si ya terminó) vs. mes anterior completo. */
export function calcularComparacionMes(servicios: Servicio[]): ComparacionSemanaMes {
  const ahora = new Date();
  return {
    actual: calcularDetallePeriodo(servicios, inicioMes(ahora), finMes(ahora), ahora),
    anterior: calcularDetallePeriodo(servicios, inicioMesPasado(ahora), finMesPasado(ahora), ahora),
  };
}

export interface HistorialDia {
  fecha: string;
  /** Trabajos dados de alta ese día (created_at). */
  trabajos: number;
  /** Ganancia neta cobrada ese día (fecha real de pago). */
  ingresos: number;
  /** Cantidad de pagos recibidos ese día. */
  pagos: number;
  /** Entregados ese día (entregado_at). */
  entregados: number;
  /**
   * Reconstrucción best-effort de cuántos trabajos seguían pendientes de
   * entrega al CIERRE de ese día: creados hasta esa fecha y todavía sin
   * entregar en ese momento (entregado_at nulo o posterior a esa fecha).
   * No hay una bitácora de cambios de estado, así que esto es una
   * aproximación a partir de las fechas reales que sí se guardan — no
   * distingue, por ejemplo, un NO REALIZADO marcado después de esa fecha
   * (se excluye del conteo igual, por simplicidad).
   */
  pendientesAlCierre: number;
}

/** Reconstruye el estado del taller para un día específico (YYYY-MM-DD). */
export function calcularHistorialDia(servicios: Servicio[], fecha: string): HistorialDia {
  const trabajos = servicios.filter((s) => getFechaLocal(s.created_at) === fecha).length;

  const pagadosEseDia = servicios.filter((s) => s.pagado && getFechaLocal(fechaPagoIso(s)) === fecha);
  const ingresos = pagadosEseDia.reduce((a, s) => a + ganancia(s), 0);
  const pagos = pagadosEseDia.length;

  const entregados = servicios.filter((s) => s.entregado_at && getFechaLocal(s.entregado_at) === fecha).length;

  const pendientesAlCierre = servicios.filter((s) => {
    if (getFechaLocal(s.created_at) > fecha) return false;
    if (s.estado === 'NO REALIZADO') return false;
    if (!s.entregado_at) return true;
    return getFechaLocal(s.entregado_at) > fecha;
  }).length;

  return { fecha, trabajos, ingresos, pagos, entregados, pendientesAlCierre };
}
