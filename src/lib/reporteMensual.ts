import type { Servicio, Garantia } from '../types';
import { getFechaLocal } from './date';
import { formatearMonto } from './moneda';
import { normalizarNombre } from './normalizarTexto';

export interface LineaCobro {
  fecha: string;
  folio?: string;
  cliente: string;
  tipoContacto: string;
  equipo: string;
  servicio: string;
  metodo: string;
  monto: number;
  estado: string;
}

export interface RankingItem {
  nombre: string;
  monto: number;
  cantidad: number;
}

export interface ReporteMensual {
  mes: string; // YYYY-MM
  labelMes: string;
  /** Bruto — total facturado, sin restar costo de repuestos. */
  cobradoTotal: number;
  /** Neto (cobradoTotal - costo_repuesto de cada cobro) — cuánto quedó realmente. */
  gananciaNeta: number;
  nCobros: number;
  porMetodo: RankingItem[];
  porTipoTrabajo: RankingItem[];
  porCliente: RankingItem[];
  altasDelMes: number;
  completadosDelMes: number;
  entregadosDelMes: number;
  porCobrarFinMes: number;
  devueltoGarantias: number;
  nGarantias: number;
  lineas: LineaCobro[];
}

function fechaPago(s: Servicio): string {
  return s.pagado_at || s.entregado_at || s.created_at;
}

function mesDe(iso: string): string {
  return getFechaLocal(iso).slice(0, 7);
}

export function labelMes(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const raw = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function mesesDisponibles(servicios: Servicio[]): string[] {
  const set = new Set<string>();
  servicios.forEach((s) => {
    set.add(mesDe(s.created_at));
    if (s.pagado) set.add(mesDe(fechaPago(s)));
  });
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function calcularReporteMensual(
  servicios: Servicio[],
  garantias: Garantia[],
  mes: string
): ReporteMensual {
  const pagadosMes = servicios.filter((s) => s.pagado && mesDe(fechaPago(s)) === mes);

  const metodoMap: { [k: string]: RankingItem } = {};
  const tipoMap: { [k: string]: RankingItem } = {};
  const clienteMap: { [k: string]: RankingItem } = {};

  let cobradoTotal = 0;
  let gananciaNeta = 0;
  pagadosMes.forEach((s) => {
    const monto = s.monto || 0;
    cobradoTotal += monto;
    gananciaNeta += monto - (s.costo_repuesto || 0);

    const metodo = s.metodo_pago || 'Sin método';
    if (!metodoMap[metodo]) metodoMap[metodo] = { nombre: metodo, monto: 0, cantidad: 0 };
    metodoMap[metodo].monto += monto;
    metodoMap[metodo].cantidad += 1;

    const tipo = s.tipo_trabajo || 'General';
    if (!tipoMap[tipo]) tipoMap[tipo] = { nombre: tipo, monto: 0, cantidad: 0 };
    tipoMap[tipo].monto += monto;
    tipoMap[tipo].cantidad += 1;

    const clienteOriginal = s.clientes?.nombre || 'General';
    // Agrupa por nombre normalizado (sin acentos) — "maria jose" y "María
    // José" no deben aparecer como dos clientes distintos en el ranking.
    const claveCliente = normalizarNombre(clienteOriginal);
    if (!clienteMap[claveCliente]) clienteMap[claveCliente] = { nombre: clienteOriginal, monto: 0, cantidad: 0 };
    clienteMap[claveCliente].monto += monto;
    clienteMap[claveCliente].cantidad += 1;
  });

  const sortRank = (a: RankingItem, b: RankingItem) => b.monto - a.monto;

  const lineas: LineaCobro[] = pagadosMes
    .map((s) => ({
      fecha: getFechaLocal(fechaPago(s)),
      folio: s.folio,
      cliente: s.clientes?.nombre || 'General',
      tipoContacto: s.clientes?.tipo_contacto === 'cliente' ? 'Cliente' : 'Técnico',
      equipo: s.modelo_equipo,
      servicio: s.tipo_trabajo,
      metodo: s.metodo_pago || '—',
      monto: s.monto || 0,
      estado: s.estado,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.folio || '').localeCompare(b.folio || ''));

  const altasDelMes = servicios.filter((s) => mesDe(s.created_at) === mes).length;
  const completadosDelMes = servicios.filter(
    (s) => s.completado_at && mesDe(s.completado_at) === mes
  ).length;
  const entregadosDelMes = servicios.filter(
    (s) => s.entregado_at && mesDe(s.entregado_at) === mes
  ).length;

  const porCobrarFinMes = servicios
    .filter((s) => !s.pagado && s.estado !== 'NO REALIZADO')
    .reduce((a, s) => a + (s.monto || 0), 0);

  const garantiasMes = garantias.filter((g) => g.created_at.slice(0, 7) === mes);
  const devueltoGarantias = garantias
    .filter((g) => g.resuelta_at && mesDe(g.resuelta_at) === mes)
    .reduce((a, g) => a + (g.monto_devuelto || 0), 0);

  return {
    mes,
    labelMes: labelMes(mes),
    cobradoTotal,
    gananciaNeta,
    nCobros: pagadosMes.length,
    porMetodo: Object.values(metodoMap).sort(sortRank),
    porTipoTrabajo: Object.values(tipoMap).sort(sortRank),
    porCliente: Object.values(clienteMap).sort(sortRank).slice(0, 15),
    altasDelMes,
    completadosDelMes,
    entregadosDelMes,
    porCobrarFinMes,
    devueltoGarantias,
    nGarantias: garantiasMes.length,
    lineas,
  };
}

function barrasHtml(
  items: RankingItem[],
  esc: (s: unknown) => string,
  color: string
): string {
  if (items.length === 0) return '<p style="color:#888">Sin datos</p>';
  const max = Math.max(1, ...items.map((i) => i.monto));
  return items
    .slice(0, 10)
    .map((item) => {
      const pct = Math.round((item.monto / max) * 100);
      return `<div class="bar-row">
        <span class="bar-label">${esc(item.nombre)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="bar-val">${esc(formatearMonto(item.monto))}</span>
      </div>`;
    })
    .join('');
}

/** Solo PDF / imprimir — MEGA UNLOCK no usa CSV. */
export function imprimirReporteMensual(r: ReporteMensual): void {
  const ventana = window.open('', '_blank');
  if (!ventana) return;

  const esc = (s: unknown) => {
    const t = s == null ? '' : String(s);
    return t
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const chartMetodo = barrasHtml(r.porMetodo, esc, '#0d9488');
  const chartTipo = barrasHtml(r.porTipoTrabajo, esc, '#7c3aed');
  const chartCliente = barrasHtml(r.porCliente, esc, '#d97706');

  const filasDetalle = r.lineas
    .map(
      (l) =>
        `<tr>
          <td>${esc(l.fecha)}</td>
          <td>${esc(l.folio)}</td>
          <td>${esc(l.cliente)}</td>
          <td>${esc(l.equipo)}</td>
          <td>${esc(l.servicio)}</td>
          <td>${esc(l.metodo)}</td>
          <td style="text-align:right">${esc(formatearMonto(l.monto))}</td>
        </tr>`
    )
    .join('');

  ventana.document.write(`
    <html>
      <head>
        <title>Reporte ${esc(r.labelMes)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; font-size: 12px; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          h2 { font-size: 13px; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          .sub { color: #555; margin-bottom: 16px; }
          .kpi { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
          .kpi div { border: 1px solid #ddd; padding: 8px 12px; border-radius: 6px; min-width: 120px; }
          .kpi strong { display: block; font-size: 14px; }
          .bar-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
          .bar-label { width: 110px; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .bar-track { flex: 1; height: 14px; background: #eee; border-radius: 3px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 3px; min-width: 2px; }
          .bar-val { width: 80px; text-align: right; font-size: 11px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; }
          th { background: #eee; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>MEGA UNLOCK — Reporte mensual</h1>
        <p class="sub">${esc(r.labelMes)} · Generado ${esc(getFechaLocal(new Date()))}</p>
        <div class="kpi">
          <div>Facturado (bruto)<strong>${esc(formatearMonto(r.cobradoTotal))}</strong></div>
          <div>Ganancia neta<strong>${esc(formatearMonto(r.gananciaNeta))}</strong></div>
          <div>Cobros<strong>${r.nCobros}</strong></div>
          <div>Trabajos nuevos<strong>${r.altasDelMes}</strong></div>
          <div>Completados<strong>${r.completadosDelMes}</strong></div>
          <div>Entregados<strong>${r.entregadosDelMes}</strong></div>
          <div>Por cobrar<strong>${esc(formatearMonto(r.porCobrarFinMes))}</strong></div>
          <div>Devuelto garantías<strong>${esc(formatearMonto(r.devueltoGarantias))}</strong></div>
        </div>
        <h2>Por método de pago</h2>
        ${chartMetodo}
        <h2>Por tipo de trabajo</h2>
        ${chartTipo}
        <h2>Top clientes</h2>
        ${chartCliente}
        <h2>Detalle de cobros (${r.lineas.length})</h2>
        <table>
          <thead><tr><th>Fecha</th><th>Folio</th><th>Cliente</th><th>Equipo</th><th>Servicio</th><th>Método</th><th>Monto</th></tr></thead>
          <tbody>${filasDetalle || '<tr><td colspan="7">Sin cobros</td></tr>'}</tbody>
        </table>
        <script>window.print()</script>
      </body>
    </html>
  `);
  ventana.document.close();
}
