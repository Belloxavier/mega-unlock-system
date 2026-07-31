import type { Garantia, Servicio, TemaUI } from '../../types';
import { getFechaLocal } from '../../lib/date';

interface GarantiaConColor extends Garantia {
  ordinal: number;
  colorClasses: string;
}

interface Props {
  T: TemaUI;
  folioGarantia: string;
  descripcionGarantia: string;
  servicioIdGarantia: string | null;
  sugerenciasFolio: Servicio[];
  sugerenciasFolioVisibles: boolean;
  garantiasConIntensidad: GarantiaConColor[];
  rankingClientesGarantiasMes: [string, number][];
  guardando: boolean;
  fmt: (n: number) => string;
  onFolioChange: (v: string) => void;
  onFocusFolio: () => void;
  onBlurFolio: () => void;
  onSeleccionarFolio: (s: Servicio) => void;
  onDescripcion: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResolver: (g: Garantia) => void;
  onEliminar: (id: string) => void;
  onFiltrarHistorialPorFolio?: (folio: string) => void;
}

export function GarantiasTab({
  T,
  folioGarantia,
  descripcionGarantia,
  servicioIdGarantia,
  sugerenciasFolio,
  sugerenciasFolioVisibles,
  garantiasConIntensidad,
  rankingClientesGarantiasMes,
  guardando,
  fmt,
  onFolioChange,
  onFocusFolio,
  onBlurFolio,
  onSeleccionarFolio,
  onDescripcion,
  onSubmit,
  onResolver,
  onEliminar,
  onFiltrarHistorialPorFolio,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
      <div className="space-y-6 lg:col-span-1">
        <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md h-fit transition-colors`}>
          <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-5`}>
            <span className={`w-2 h-2 rounded-full ${T.dot}`} />
            Registrar Garantía
          </h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Folio del trabajo
              </label>
              <input
                type="text"
                value={folioGarantia}
                onChange={(e) => onFolioChange(e.target.value)}
                onFocus={onFocusFolio}
                onBlur={onBlurFolio}
                required
                autoComplete="off"
                placeholder="Ej. F13"
                className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all font-mono`}
              />
              {sugerenciasFolioVisibles && sugerenciasFolio.length > 0 && (
                <div className={`absolute z-20 mt-1 w-full bg-slate-950 border ${T.sugerenciaBorde} rounded-xl overflow-hidden shadow-xl`}>
                  {sugerenciasFolio.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => onSeleccionarFolio(s)}
                      className={`w-full text-left px-4 py-3 text-sm text-slate-200 ${T.sugerenciaHover} transition-colors flex justify-between items-center gap-2`}
                    >
                      <span className="font-mono">{s.folio}</span>
                      <span className="text-xs text-slate-500 truncate">
                        {s.clientes?.nombre} · {s.modelo_equipo}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {servicioIdGarantia && (
                <p className="text-[10px] text-emerald-400 mt-1">✓ Trabajo encontrado y enlazado</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Descripción del problema
              </label>
              <textarea
                value={descripcionGarantia}
                onChange={(e) => onDescripcion(e.target.value)}
                required
                rows={3}
                placeholder="Ej. No quitó la cuenta"
                className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all resize-none`}
              />
            </div>
            <button
              type="submit"
              disabled={guardando}
              className={`w-full py-3.5 md:py-3 rounded-xl text-xs md:text-sm uppercase tracking-wider font-black transition-all disabled:opacity-60 ${T.submit}`}
            >
              {guardando ? 'Guardando…' : '+ Registrar Garantía'}
            </button>
          </form>
        </div>

        <div className={`bg-slate-900/80 border ${T.borde2} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
          <h3 className={`text-xs font-bold ${T.texto2} uppercase tracking-widest mb-3`}>
            ⚠️ Más Garantías Este Mes
          </h3>
          <div className="space-y-2">
            {rankingClientesGarantiasMes.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Sin garantías este mes.</p>
            ) : (
              rankingClientesGarantiasMes.map(([nombre, cantidad], idx) => (
                <div
                  key={nombre}
                  className={`flex justify-between items-center bg-slate-950/60 border px-4 py-2 rounded-xl text-xs ${
                    cantidad >= 3 ? 'border-rose-500/40' : 'border-slate-800/80'
                  }`}
                >
                  <span className="font-semibold text-slate-300">
                    #{idx + 1} {nombre}
                    {cantidad >= 3 && (
                      <span className="ml-1.5 text-[9px] text-rose-400 uppercase font-bold">Alerta</span>
                    )}
                  </span>
                  <span className={`font-black ${T.fuerte2}`}>{cantidad}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={`lg:col-span-2 bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
        <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-5`}>
          <span className={`w-2 h-2 rounded-full ${T.dot2}`} />
          Historial de Garantías
        </h2>
        {garantiasConIntensidad.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No hay garantías registradas.</p>
        ) : (
          <div className="space-y-3">
            {garantiasConIntensidad.map((g) => (
              <div key={g.id} className={`border rounded-xl p-4 ${g.colorClasses}`}>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-mono font-black text-sm flex items-center gap-2">
                      {g.folio}
                      {onFiltrarHistorialPorFolio && g.folio && (
                        <button
                          type="button"
                          onClick={() => onFiltrarHistorialPorFolio(g.folio)}
                          className="text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-300 border border-slate-600/50 px-1.5 py-0.5 rounded"
                          title="Ver en historial de trabajos"
                        >
                          Ver trabajo
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {g.servicios?.clientes?.nombre || 'Cliente desconocido'} ·{' '}
                      {g.servicios?.modelo_equipo} ({g.servicios?.tipo_trabajo})
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {g.ordinal}ª este mes
                    </span>
                    <button
                      type="button"
                      onClick={() => onResolver(g)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        g.resuelta
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700'
                      }`}
                    >
                      {g.resuelta ? '✓ Resuelta' : 'Pendiente'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEliminar(g.id)}
                      className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-200 mt-2">{g.descripcion}</p>
                {g.resuelta && g.nota_resolucion && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-xs">
                    <span className="text-slate-400">✓ {g.nota_resolucion}</span>
                    {g.monto_devuelto ? (
                      <span className="block font-bold text-rose-300 mt-0.5">
                        Devuelto: {fmt(g.monto_devuelto)}
                      </span>
                    ) : null}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 mt-2">{getFechaLocal(g.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
