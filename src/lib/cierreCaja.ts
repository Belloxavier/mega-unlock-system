import type { Servicio, Garantia } from '../types';
import { getFechaLocal } from './date';
import { formatearNumero } from './moneda';

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

function fechaPagoIso(s: Servicio): string {
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
function ganancia(s: Servicio): number {
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
