import { useMemo, useState } from 'react';
import type { Servicio, Garantia, TemaUI } from '../../types';
import {
  calcularReporteMensual,
  mesesDisponibles,
  imprimirReporteMensual,
  labelMes,
} from '../../lib/reporteMensual';
import { formatearMonto } from '../../lib/moneda';
import { getFechaLocal } from '../../lib/date';
import { BarChart } from './components/BarChart';

interface Props {
  abierto: boolean;
  T: TemaUI;
  servicios: Servicio[];
  garantias: Garantia[];
  onCerrar: () => void;
  /** Si no se pasa, usa formatearMonto es-CL sin decimales. */
  fmt?: (n: number) => string;
}

export function ReporteMensualModal({
  abierto,
  T,
  servicios,
  garantias,
  onCerrar,
  fmt = formatearMonto,
}: Props) {
  const meses = useMemo(() => {
    const list = mesesDisponibles(servicios);
    const actual = getFechaLocal(new Date()).slice(0, 7);
    if (!list.includes(actual)) list.unshift(actual);
    return list;
  }, [servicios]);

  const [mes, setMes] = useState(() => getFechaLocal(new Date()).slice(0, 7));

  const reporte = useMemo(
    () => calcularReporteMensual(servicios, garantias, mes),
    [servicios, garantias, mes]
  );

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className={`text-sm font-black uppercase tracking-wider ${T.texto}`}>
            📊 Reporte mensual
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-white text-sm px-2"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          Mes
        </label>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white mb-4 focus:outline-none focus:border-cyan-400"
        >
          {meses.map((m) => (
            <option key={m} value={m}>
              {labelMes(m)}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Cobrado', value: fmt(reporte.cobradoTotal), sub: `${reporte.nCobros} cobros` },
            { label: 'Altas', value: String(reporte.altasDelMes), sub: 'registrados' },
            { label: 'Entregados', value: String(reporte.entregadosDelMes), sub: 'en el mes' },
            {
              label: 'Devuelto',
              value: fmt(reporte.devueltoGarantias),
              sub: `${reporte.nGarantias} garantías`,
            },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center"
            >
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{k.label}</p>
              <p className={`text-base font-black ${T.fuerte}`}>{k.value}</p>
              <p className="text-[10px] text-slate-600">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 mb-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              💳 Por método de pago
            </p>
            <BarChart
              items={reporte.porMetodo}
              fmt={fmt}
              barraClass={
                T.barraGradiente
                  ? `bg-gradient-to-r ${T.barraGradiente}`
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
              }
            />
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              🔧 Por tipo de trabajo
            </p>
            <BarChart
              items={reporte.porTipoTrabajo}
              fmt={fmt}
              maxItems={8}
              barraClass="bg-gradient-to-r from-violet-500 to-fuchsia-400"
            />
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              💎 Top clientes
            </p>
            <BarChart
              items={reporte.porCliente}
              fmt={fmt}
              maxItems={10}
              barraClass="bg-gradient-to-r from-amber-500 to-orange-400"
            />
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mb-3">
          Cobrado = por fecha de pago del mes. Por cobrar = saldo actual (no histórico del fin de
          mes).
        </p>

        <button
          type="button"
          onClick={() => imprimirReporteMensual(reporte)}
          className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider ${T.submit}`}
        >
          🖨️ PDF / Imprimir
        </button>
      </div>
    </div>
  );
}
