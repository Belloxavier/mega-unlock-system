import { useMemo, useState } from 'react';
import type { Servicio, TemaUI } from '../../types';
import { DIAS_SEMANA, getFechaLocal } from '../../lib/date';
import {
  calcularComparacionFinanciera,
  calcularComparacionFinancieraSemana,
  type ComparacionFinancieraPeriodo,
  type ComparacionFinancieraSemana,
} from '../../lib/cierreCaja';
import { formatearPorcentaje } from '../../lib/moneda';
import { BarChart } from './components/BarChart';
import { CalendarioSemana } from './components/CalendarioSemana';

const OPCIONES_DIAS = [7, 30, 90, 180, 365] as const;

// Fecha YYYY-MM-DD → "15/07", para etiquetas compactas dentro de tarjetas.
function formatearFechaCorta(fechaStr: string): string {
  const [, m, d] = fechaStr.split('-');
  return `${d}/${m}`;
}

// Compartido por el modo "relativo" (7/30/90/180/365 días) y el modo
// "semana específica" (calendario) — ambos calculan exactamente el mismo
// desglose (ver lib/cierreCaja.ts), solo cambia qué rango de fechas se les
// pasa, así que la UI para mostrarlo es una sola.
function DesgloseFinanciero({
  data,
  T,
  fmt,
}: {
  data: ComparacionFinancieraPeriodo | ComparacionFinancieraSemana;
  T: TemaUI;
  fmt: (n: number) => string;
}) {
  // Cuántos días tiene el rango mostrado, para poder decir "23 de 30" en
  // vez de solo "23" — el modo semana siempre son 7 días (no viene en el
  // dato, a diferencia del modo relativo que sí trae `dias`).
  const diasEnRango = 'dias' in data ? data.dias : 7;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-2.5">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Ingresos (neto)
          </p>
          <p className={`text-base font-black ${T.texto}`}>{fmt(data.totalIngresos)}</p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Trabajos</p>
          <p className={`text-base font-black ${T.texto}`}>{data.totalTrabajos}</p>
          <p className="text-[9px] text-slate-600 mt-0.5">creados en el período</p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pagos</p>
          <p className={`text-base font-black ${T.texto}`}>{data.totalPagos}</p>
          <p className="text-[9px] text-slate-600 mt-0.5">cobros en el período</p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Días con cobro
          </p>
          <p className={`text-base font-black ${T.texto}`}>
            {data.diasConCobro} <span className="text-slate-500 text-sm font-bold">de {diasEnRango}</span>
          </p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Promedio/día con cobro
          </p>
          <p className={`text-base font-black ${T.texto}`}>{fmt(Math.round(data.promedioPorDiaConCobro))}</p>
          <p className="text-[9px] text-slate-600 mt-0.5">solo días con cobro, no cuenta los días en cero</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mejor día</p>
          <p className="text-sm font-black text-emerald-400">
            {data.mejorDia ? `${formatearFechaCorta(data.mejorDia.fecha)} · ${fmt(data.mejorDia.monto)}` : 'Sin datos'}
          </p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Peor día</p>
          <p className="text-sm font-black text-amber-400">
            {data.peorDia ? `${formatearFechaCorta(data.peorDia.fecha)} · ${fmt(data.peorDia.monto)}` : 'Sin datos'}
          </p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Tendencia vs. período anterior
          </p>
          <p
            className={`text-sm font-black ${
              data.tendenciaPct == null ? 'text-slate-500' : data.tendenciaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {data.tendenciaPct == null ? 'Sin datos previos' : formatearPorcentaje(data.tendenciaPct)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            💳 Por método (período)
          </p>
          <BarChart
            items={data.porMetodo}
            fmt={fmt}
            barraClass={T.barraGradiente ? `bg-gradient-to-r ${T.barraGradiente}` : 'bg-gradient-to-r from-cyan-500 to-emerald-400'}
          />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            🔧 Por tipo de trabajo (período)
          </p>
          <BarChart items={data.porTipo} fmt={fmt} barraClass="bg-gradient-to-r from-violet-500 to-fuchsia-400" />
        </div>
      </div>
    </>
  );
}

interface Props {
  T: TemaUI;
  /** Tabla completa (no paginada) — solo para la Comparación por Período de acá abajo. */
  servicios: Servicio[];
  cajaSemana: number;
  cajaSemanaPasada: number;
  cajaMes: number;
  cajaMesPasado: number;
  deltaSemana: number;
  deltaMes: number;
  /** Nombre del mes calendario actual/anterior (ej. "Febrero"/"Enero"), para no obligar a hacer la cuenta mental de qué mes es cada uno. */
  nombreMesActual: string;
  nombreMesAnterior: string;
  porCobrarTotal: number;
  totalDevueltoGarantias: number;
  flujoPorDiaObj: { [dia: string]: number };
  maxFlujoDia: number;
  /** Cantidad de trabajos pagados por día de la semana (histórico). */
  conteoPorDiaObj: { [dia: string]: number };
  fmt: (n: number) => string;
  onAbrirReporteMensual: () => void;
  onAbrirPagosPorDia: () => void;
}

export function FinanzasTab({
  T,
  servicios,
  cajaSemana,
  cajaSemanaPasada,
  cajaMes,
  cajaMesPasado,
  deltaSemana,
  deltaMes,
  nombreMesActual,
  nombreMesAnterior,
  porCobrarTotal,
  totalDevueltoGarantias,
  flujoPorDiaObj,
  maxFlujoDia,
  conteoPorDiaObj,
  fmt,
  onAbrirReporteMensual,
  onAbrirPagosPorDia,
}: Props) {
  const [modoComparacion, setModoComparacion] = useState<'relativo' | 'semana'>('relativo');
  const [diasComparacion, setDiasComparacion] = useState<number>(30);
  const [semanaElegida, setSemanaElegida] = useState<string | null>(null);

  const comparacion = useMemo(
    () => calcularComparacionFinanciera(servicios, diasComparacion),
    [servicios, diasComparacion]
  );

  const semanaParaMostrar = semanaElegida || getFechaLocal(new Date());
  const comparacionSemana = useMemo(() => {
    const [y, m, d] = semanaParaMostrar.split('-').map(Number);
    return calcularComparacionFinancieraSemana(servicios, new Date(y, m - 1, d));
  }, [servicios, semanaParaMostrar]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onAbrirPagosPorDia}
          className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
        >
          📅 Pagos por día
        </button>
        <button
          type="button"
          onClick={onAbrirReporteMensual}
          className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all"
        >
          📊 Reporte mensual
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/40 border border-emerald-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.07)] backdrop-blur-md">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
            Semana Actual vs Anterior
          </p>
          <p className="text-[10px] text-slate-500 mb-2">Calendario lunes–domingo (no últimos 7 días rodantes)</p>
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] text-slate-400">Esta semana</p>
              <p className="text-xl font-black text-emerald-300">{fmt(cajaSemana)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Semana anterior</p>
              <p className="text-sm font-bold text-slate-400">{fmt(cajaSemanaPasada)}</p>
            </div>
          </div>
          <div
            className={`text-xs font-bold pt-2 border-t border-emerald-500/20 ${
              deltaSemana >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {deltaSemana >= 0 ? '▲' : '▼'} {fmt(Math.abs(deltaSemana))}{' '}
            {deltaSemana >= 0 ? 'más' : 'menos'} que la semana anterior
          </div>
        </div>

        <div className={`${T.financeCard2} p-5 md:p-6 rounded-2xl backdrop-blur-md transition-colors`}>
          <p className={`text-xs font-bold ${T.fuerte2} uppercase tracking-widest mb-3`}>
            Mes Actual vs Anterior
          </p>
          <p className="text-[10px] text-slate-500 mb-2">Mes calendario completo (no últimos 30 días rodantes)</p>
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] text-slate-400">{nombreMesActual}</p>
              <p className={`text-xl font-black ${T.texto2}`}>{fmt(cajaMes)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">{nombreMesAnterior}</p>
              <p className="text-sm font-bold text-slate-400">{fmt(cajaMesPasado)}</p>
            </div>
          </div>
          <div
            className={`text-xs font-bold pt-2 border-t ${T.borde2} ${
              deltaMes >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {deltaMes >= 0 ? '▲' : '▼'} {fmt(Math.abs(deltaMes))} {deltaMes >= 0 ? 'más' : 'menos'} que el
            mes anterior
          </div>
        </div>
      </div>

      <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md`}>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest`}>
            📊 Comparación por Período
          </h3>
          <div className="flex gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1 flex-wrap">
            <button
              type="button"
              onClick={() => setModoComparacion('relativo')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                modoComparacion === 'relativo' ? T.filtroActivo : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Días
            </button>
            <button
              type="button"
              onClick={() => setModoComparacion('semana')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                modoComparacion === 'semana' ? T.filtroActivo : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📅 Semana específica
            </button>
          </div>
        </div>

        {modoComparacion === 'relativo' ? (
          <>
            <div className="flex gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1 flex-wrap mb-4 w-fit">
              {OPCIONES_DIAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiasComparacion(d)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    diasComparacion === d ? T.filtroActivo : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <DesgloseFinanciero data={comparacion} T={T} fmt={fmt} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 mb-4">
              <CalendarioSemana T={T} semanaSeleccionada={semanaElegida} onSeleccionarSemana={setSemanaElegida} />
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Semana elegida
                </p>
                <p className={`text-sm font-bold ${T.texto}`}>
                  {formatearFechaCorta(comparacionSemana.fechaInicio)} – {formatearFechaCorta(comparacionSemana.fechaFin)}
                </p>
                {!semanaElegida && <p className="text-[10px] text-slate-500 mt-1">Semana actual (por defecto)</p>}
              </div>
            </div>
            <DesgloseFinanciero data={comparacionSemana} T={T} fmt={fmt} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/40 border border-amber-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.07)] backdrop-blur-md">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Por Cobrar (Total)</p>
            <span className="font-black text-amber-300 text-2xl">{fmt(porCobrarTotal)}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Histórico completo, no depende del período elegido arriba</p>
        </div>
        <div className="bg-gradient-to-br from-slate-900/90 to-rose-950/40 border border-rose-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.07)] backdrop-blur-md">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Devuelto por Garantías</p>
            <span className="font-black text-rose-300 text-2xl">{fmt(totalDevueltoGarantias)}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Histórico completo, no depende del período elegido arriba</p>
        </div>
      </div>

      <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
        <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest mb-4`}>
          📅 Flujo por Día de la Semana (Histórico)
        </h3>
        <div className="space-y-3">
          {DIAS_SEMANA.map((dia) => {
            const valor = flujoPorDiaObj[dia] || 0;
            const cantidad = conteoPorDiaObj[dia] || 0;
            const pct = Math.round((valor / maxFlujoDia) * 100);
            return (
              <div key={dia} className="flex items-center gap-3">
                <span className="w-16 text-[11px] font-semibold text-slate-400 uppercase">{dia.slice(0, 3)}</span>
                <div className="flex-1 h-6 bg-slate-950/80 rounded-lg overflow-hidden border border-slate-800">
                  <div
                    className={`h-full bg-gradient-to-r ${T.barraGradiente} rounded-lg transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 text-right text-[10px] text-slate-500">
                  {cantidad} trab.
                </span>
                <span className={`w-24 text-right text-xs font-black ${T.texto}`}>{fmt(valor)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
