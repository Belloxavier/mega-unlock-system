import type { Servicio, Garantia } from '../types';
import { getFechaLocal } from './date';
import { formatearNumero } from './moneda';
import { estaEnRango } from './fechaFinanzas';

export interface CobroDetalle {
  id: string;
  hora: string;
  folio?: string;
  cliente: string;
  metodo: string;
  /** Neto (monto - costo_repuesto) — lo que de verdad quedó en la mano por este cobro. */
  monto: number;
}

export interface ResumenCierre {
  fecha: string; // YYYY-MM-DD local
  /** Neto (monto - costo_repuesto de cada cobro), no lo facturado bruto — así cuadra con la plata real del día. */
  cobradoTotal: number;
  porMetodo: { metodo: string; monto: number; cantidad: number }[];
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  otrosMetodos: number;
  nCobros: number;
  /** Bruto a propósito: es deuda pendiente del cliente, no ganancia pendiente. */
  porCobrar: number;
  devueltoGarantias: number;
  nAltas: number;
  cobros: CobroDetalle[];
}

/** Fecha real del pago (pagado_at, editable desde el Historial) — nunca
 * created_at. Exportada para que otros cálculos (estadísticas operativas,
 * comparaciones de período) contabilicen el dinero en el día en que
 * realmente se cobró, no en el día en que se creó el registro. */
export function fechaPagoIso(s: Servicio): string {
  return s.pagado_at || s.entregado_at || s.created_at;
}

function horaLocal(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// El costo del repuesto casi siempre sale de la misma plata que el cliente
// acaba de pagar (se compra el mismo día) — el cierre de caja tiene que
// reflejar lo que de verdad queda en la mano, no lo cobrado bruto. A
// técnicos/mayoristas nunca se les registra costo_repuesto, así que para
// esos trabajos ganancia === monto (sin cambio).
export function ganancia(s: Servicio): number {
  return (s.monto || 0) - (s.costo_repuesto || 0);
}

/** Calcula el resumen de cierre para una fecha local (default: hoy). */
export function calcularCierre(
  servicios: Servicio[],
  garantias: Garantia[],
  fechaStr?: string
): ResumenCierre {
  const fecha = fechaStr || getFechaLocal(new Date());

  const pagadosHoy = servicios.filter(
    (s) => s.pagado && getFechaLocal(fechaPagoIso(s)) === fecha
  );

  const metodoMap: { [k: string]: { monto: number; cantidad: number } } = {};
  let efectivo = 0;
  let transferencia = 0;
  let tarjeta = 0;
  let otrosMetodos = 0;

  pagadosHoy.forEach((s) => {
    const m = (s.metodo_pago || 'Sin método').trim() || 'Sin método';
    if (!metodoMap[m]) metodoMap[m] = { monto: 0, cantidad: 0 };
    metodoMap[m].monto += ganancia(s);
    metodoMap[m].cantidad += 1;

    const key = m.toLowerCase();
    if (key.includes('efectivo')) efectivo += ganancia(s);
    else if (key.includes('transfer')) transferencia += ganancia(s);
    else if (key.includes('tarjeta')) tarjeta += ganancia(s);
    else otrosMetodos += ganancia(s);
  });

  const porMetodo = Object.entries(metodoMap)
    .map(([metodo, v]) => ({ metodo, monto: v.monto, cantidad: v.cantidad }))
    .sort((a, b) => b.monto - a.monto);

  const cobradoTotal = pagadosHoy.reduce((a, s) => a + ganancia(s), 0);

  const cobros: CobroDetalle[] = pagadosHoy
    .map((s) => ({
      id: s.id,
      hora: horaLocal(fechaPagoIso(s)),
      folio: s.folio,
      cliente: s.clientes?.nombre || 'General',
      metodo: s.metodo_pago || '—',
      monto: ganancia(s),
    }))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const porCobrar = servicios
    .filter((s) => !s.pagado && s.estado !== 'NO REALIZADO')
    .reduce((a, s) => a + (s.monto || 0), 0);

  const devueltoGarantias = garantias
    .filter((g) => g.resuelta && g.resuelta_at && getFechaLocal(g.resuelta_at) === fecha)
    .reduce((a, g) => a + (g.monto_devuelto || 0), 0);

  const nAltas = servicios.filter((s) => getFechaLocal(s.created_at) === fecha).length;

  return {
    fecha,
    cobradoTotal,
    porMetodo,
    efectivo,
    transferencia,
    tarjeta,
    otrosMetodos,
    nCobros: pagadosHoy.length,
    porCobrar,
    devueltoGarantias,
    nAltas,
    cobros,
  };
}

export function textoResumenWhatsApp(
  r: ResumenCierre,
  opts?: { efectivoContado?: number | null; nota?: string }
): string {
  const lineas = [
    `Cierre ${r.fecha}`,
    `Cobrado (neto): $${formatearNumero(r.cobradoTotal)} (${r.nCobros} cobros)`,
    `Efectivo $${formatearNumero(r.efectivo)} · Transfer $${formatearNumero(r.transferencia)} · Tarjeta $${formatearNumero(r.tarjeta)}`,
  ];
  if (r.otrosMetodos > 0) lineas.push(`Otros: $${formatearNumero(r.otrosMetodos)}`);
  lineas.push(`Por cobrar: $${formatearNumero(r.porCobrar)}`);
  if (r.devueltoGarantias > 0) lineas.push(`Devuelto garantías: $${formatearNumero(r.devueltoGarantias)}`);
  lineas.push(`Altas del día: ${r.nAltas}`);
  if (opts?.efectivoContado != null && !isNaN(opts.efectivoContado)) {
    const dif = opts.efectivoContado - r.efectivo;
    lineas.push(
      `Efectivo contado: $${formatearNumero(opts.efectivoContado)} (dif. ${dif >= 0 ? '+' : ''}${formatearNumero(dif)})`
    );
  }
  if (opts?.nota?.trim()) lineas.push(`Nota: ${opts.nota.trim()}`);
  return lineas.join('\n');
}

export interface CierreGuardado {
  id: string;
  fecha: string;
  cerrado_at: string;
  cobrado_total: number;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  otros_metodos: number;
  n_cobros: number;
  por_cobrar: number;
  devuelto_garantias: number;
  n_altas: number;
  efectivo_contado: number | null;
  diferencia_efectivo: number | null;
  nota: string | null;
  detalle?: CobroDetalle[] | null;
}

export interface DiaMonto {
  fecha: string;
  monto: number;
}

export interface RankingMonto {
  nombre: string;
  monto: number;
  cantidad: number;
}

export interface ComparacionFinancieraPeriodo {
  dias: number;
  /** Ganancia neta del período (fecha real de pago, no created_at). */
  totalIngresos: number;
  totalPagos: number;
  diasConCobro: number;
  promedioPorDiaConCobro: number;
  mejorDia: DiaMonto | null;
  peorDia: DiaMonto | null;
  totalAnterior: number;
  /** null si el período anterior no tuvo cobros (no hay base para comparar). */
  tendenciaPct: number | null;
  porMetodo: RankingMonto[];
  porTipo: RankingMonto[];
}

/**
 * Compara los últimos `dias` días contra los `dias` inmediatamente
 * anteriores — igual criterio que calcularComparacionPeriodo (estadísticas
 * operativas) pero en dinero: todo por fecha real de pago (fechaPagoIso),
 * nunca por created_at.
 */
export function calcularComparacionFinanciera(servicios: Servicio[], dias: number): ComparacionFinancieraPeriodo {
  const ahora = new Date();
  const finActual = ahora;
  const iniActual = new Date(ahora);
  iniActual.setDate(iniActual.getDate() - dias + 1);
  iniActual.setHours(0, 0, 0, 0);

  const finAnterior = new Date(iniActual.getTime() - 1);
  const iniAnterior = new Date(finAnterior);
  iniAnterior.setDate(iniAnterior.getDate() - dias + 1);
  iniAnterior.setHours(0, 0, 0, 0);

  const pagadosActual = servicios.filter((s) => s.pagado && estaEnRango(fechaPagoIso(s), iniActual, finActual));

  const porDiaMap = new Map<string, number>();
  pagadosActual.forEach((s) => {
    const f = getFechaLocal(fechaPagoIso(s));
    porDiaMap.set(f, (porDiaMap.get(f) || 0) + ganancia(s));
  });
  const porDia: DiaMonto[] = Array.from(porDiaMap.entries()).map(([fecha, monto]) => ({ fecha, monto }));

  const totalIngresos = porDia.reduce((a, d) => a + d.monto, 0);
  const diasConCobro = porDia.length;
  const mejorDia = [...porDia].sort((a, b) => b.monto - a.monto)[0] || null;

  // Mismo criterio que la comparación de trabajos: no dejar que el día en
  // curso (todavía no cerrado) gane el título de "peor día" solo por estar
  // a medio transcurrir.
  const hoyStr = getFechaLocal(ahora);
  const diasCompletos = porDia.filter((d) => d.fecha !== hoyStr);
  const candidatosPeor = diasCompletos.length > 0 ? diasCompletos : porDia;
  const peorDia = [...candidatosPeor].sort((a, b) => a.monto - b.monto)[0] || null;

  const totalAnterior = servicios
    .filter((s) => s.pagado && estaEnRango(fechaPagoIso(s), iniAnterior, finAnterior))
    .reduce((a, s) => a + ganancia(s), 0);
  const tendenciaPct = totalAnterior > 0 ? ((totalIngresos - totalAnterior) / totalAnterior) * 100 : null;

  const metodoMap = new Map<string, { monto: number; cantidad: number }>();
  const tipoMap = new Map<string, { monto: number; cantidad: number }>();
  pagadosActual.forEach((s) => {
    const m = (s.metodo_pago || 'Sin método').trim() || 'Sin método';
    const mEntry = metodoMap.get(m) || { monto: 0, cantidad: 0 };
    mEntry.monto += ganancia(s);
    mEntry.cantidad += 1;
    metodoMap.set(m, mEntry);

    const t = s.tipo_trabajo || 'General';
    const tEntry = tipoMap.get(t) || { monto: 0, cantidad: 0 };
    tEntry.monto += ganancia(s);
    tEntry.cantidad += 1;
    tipoMap.set(t, tEntry);
  });

  const porMetodo = Array.from(metodoMap.entries())
    .map(([nombre, v]) => ({ nombre, monto: v.monto, cantidad: v.cantidad }))
    .sort((a, b) => b.monto - a.monto);
  const porTipo = Array.from(tipoMap.entries())
    .map(([nombre, v]) => ({ nombre, monto: v.monto, cantidad: v.cantidad }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 8);

  return {
    dias,
    totalIngresos,
    totalPagos: pagadosActual.length,
    diasConCobro,
    promedioPorDiaConCobro: diasConCobro > 0 ? totalIngresos / diasConCobro : 0,
    mejorDia,
    peorDia,
    totalAnterior,
    tendenciaPct,
    porMetodo,
    porTipo,
  };
}
