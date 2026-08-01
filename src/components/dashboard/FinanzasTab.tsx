import type { TemaUI } from '../../types';
import { DIAS_SEMANA } from '../../lib/date';

interface Props {
  T: TemaUI;
  cajaSemana: number;
  cajaSemanaPasada: number;
  cajaMes: number;
  cajaMesPasado: number;
  deltaSemana: number;
  deltaMes: number;
  porCobrarTotal: number;
  totalDevueltoGarantias: number;
  flujoPorDiaObj: { [dia: string]: number };
  maxFlujoDia: number;
  /** Cantidad de trabajos pagados por día de la semana (histórico). */
  conteoPorDiaObj: { [dia: string]: number };
  /** Desglose por método de pago (pagados del mes actual). */
  porMetodoMes: { metodo: string; monto: number }[];
  /** Desglose por tipo de trabajo (pagados del mes actual). */
  porTipoMes: { tipo: string; monto: number }[];
  fmt: (n: number) => string;
  onAbrirReporteMensual: () => void;
  onAbrirPagosPorDia: () => void;
}

export function FinanzasTab({
  T,
  cajaSemana,
  cajaSemanaPasada,
  cajaMes,
  cajaMesPasado,
  deltaSemana,
  deltaMes,
  porCobrarTotal,
  totalDevueltoGarantias,
  flujoPorDiaObj,
  maxFlujoDia,
  conteoPorDiaObj,
  porMetodoMes,
  porTipoMes,
  fmt,
  onAbrirReporteMensual,
  onAbrirPagosPorDia,
}: Props) {
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
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] text-slate-400">Este mes</p>
              <p className={`text-xl font-black ${T.texto2}`}>{fmt(cajaMes)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Mes anterior</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/40 border border-amber-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.07)] backdrop-blur-md flex justify-between items-center">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Por Cobrar (Total)</p>
          <span className="font-black text-amber-300 text-2xl">{fmt(porCobrarTotal)}</span>
        </div>
        <div className="bg-gradient-to-br from-slate-900/90 to-rose-950/40 border border-rose-500/30 p-5 md:p-6 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.07)] backdrop-blur-md flex justify-between items-center">
          <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Devuelto por Garantías</p>
          <span className="font-black text-rose-300 text-2xl">{fmt(totalDevueltoGarantias)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
          <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest mb-3`}>
            💳 Por método de pago (mes)
          </h3>
          {porMetodoMes.length === 0 ? (
            <p className="text-xs text-slate-500">Sin cobros este mes.</p>
          ) : (
            <div className="space-y-2">
              {porMetodoMes.map((row) => (
                <div
                  key={row.metodo}
                  className="flex justify-between text-xs bg-slate-950/60 border border-slate-800/80 px-3 py-2 rounded-lg"
                >
                  <span className="text-slate-300 font-semibold">{row.metodo}</span>
                  <span className={`font-black ${T.fuerte}`}>{fmt(row.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`bg-slate-900/80 border ${T.borde2} p-5 rounded-2xl shadow-xl backdrop-blur-md`}>
          <h3 className={`text-xs font-bold ${T.texto2} uppercase tracking-widest mb-3`}>
            🔧 Por tipo de trabajo (mes)
          </h3>
          {porTipoMes.length === 0 ? (
            <p className="text-xs text-slate-500">Sin cobros este mes.</p>
          ) : (
            <div className="space-y-2">
              {porTipoMes.map((row) => (
                <div
                  key={row.tipo}
                  className="flex justify-between text-xs bg-slate-950/60 border border-slate-800/80 px-3 py-2 rounded-lg"
                >
                  <span className="text-slate-300 font-semibold truncate mr-2">{row.tipo}</span>
                  <span className={`font-black ${T.fuerte2} flex-shrink-0`}>{fmt(row.monto)}</span>
                </div>
              ))}
            </div>
          )}
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
