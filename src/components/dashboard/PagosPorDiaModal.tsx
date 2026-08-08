import { useMemo, useState } from 'react';
import type { Servicio, Garantia, TemaUI } from '../../types';
import { calcularCierre } from '../../lib/cierreCaja';
import { getFechaLocal, sumarDias } from '../../lib/date';

interface Props {
  abierto: boolean;
  T: TemaUI;
  servicios: Servicio[];
  garantias: Garantia[];
  onCerrar: () => void;
  fmt: (n: number) => string;
}

// Reutiliza calcularCierre (lib/cierreCaja.ts) con una fecha cualquiera en
// vez de "hoy" — mismo cálculo de cobros por día, sin duplicar lógica.
export function PagosPorDiaModal({ abierto, T, servicios, garantias, onCerrar, fmt }: Props) {
  const [fecha, setFecha] = useState(() => getFechaLocal(new Date()));
  const hoy = getFechaLocal(new Date());

  const resumen = useMemo(
    () => calcularCierre(servicios, garantias, fecha),
    [servicios, garantias, fecha]
  );

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className={`text-sm font-black uppercase tracking-wider ${T.texto}`}>
            📅 Pagos por día
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
          Fecha
        </label>
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFecha((f) => sumarDias(f, -1))}
            aria-label="Día anterior"
            className="flex-shrink-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white hover:border-cyan-400 transition-colors"
          >
            ←
          </button>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() => setFecha((f) => sumarDias(f, 1))}
            disabled={fecha >= hoy}
            aria-label="Día siguiente"
            className="flex-shrink-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white hover:border-cyan-400 transition-colors disabled:opacity-30 disabled:hover:border-slate-700"
          >
            →
          </button>
          {fecha !== hoy && (
            <button
              type="button"
              onClick={() => setFecha(hoy)}
              className="flex-shrink-0 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              Cobrado ese día (neto)
            </p>
            <p className="text-xl font-black text-emerald-300">{fmt(resumen.cobradoTotal)}</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Trabajos pagados
            </p>
            <p className={`text-xl font-black ${T.fuerte}`}>{resumen.nCobros}</p>
          </div>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 sticky top-0">
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-2">Hora</th>
                <th className="py-2 px-2">Folio</th>
                <th className="py-2 px-2">Cliente</th>
                <th className="py-2 px-2">Método</th>
                <th className="py-2 px-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {resumen.cobros.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    Sin pagos ese día
                  </td>
                </tr>
              ) : (
                resumen.cobros.map((c) => (
                  <tr key={c.id} className="text-slate-300">
                    <td className="py-1.5 px-2 font-mono text-[10px]">{c.hora}</td>
                    <td className="py-1.5 px-2 font-mono text-[10px]">{c.folio || '—'}</td>
                    <td className="py-1.5 px-2 truncate max-w-[120px]">{c.cliente}</td>
                    <td className="py-1.5 px-2 text-[10px]">{c.metodo}</td>
                    <td className="py-1.5 px-2 text-right font-bold">{fmt(c.monto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
