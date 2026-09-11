import { useEffect, useState } from 'react';
import type { Garantia, Servicio, TemaUI } from '../../types';
import { getFechaLocal } from '../../lib/date';
import { calcularEstadoGarantia } from '../../lib/garantia';
import { BadgeGarantia } from './components/BadgeGarantia';

const PAGE_SIZE_COBERTURA = 20;

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
  /** Búsqueda por cliente en Cobertura — filtra la misma lista, no es la única forma de ver algo. */
  busquedaCobertura: string;
  /** TODOS los equipos ENTREGADO (o los que calzan con la búsqueda), ya ordenados — Garantías→Cobertura pagina esto del lado de la vista. */
  equiposCobertura: Servicio[];
  ordenCobertura: 'reciente' | 'antiguo';
  onBusquedaCobertura: (v: string) => void;
  onOrdenCobertura: (v: 'reciente' | 'antiguo') => void;
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

// "Reclamos" (equipos que volvieron por una falla, tabla que ya existía) y
// "Cobertura" (buscador de garantía automática de 3 meses por cliente) son
// conceptos distintos que comparten pantalla — se separan en sub-pestañas
// para no mezclarlos, sin tocar la lógica de Reclamos.
function GarantiasReclamos({
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
}: Omit<Props, 'busquedaCobertura' | 'equiposCobertura' | 'ordenCobertura' | 'onBusquedaCobertura' | 'onOrdenCobertura'>) {
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

function GarantiasCobertura({
  T,
  busquedaCobertura,
  equiposCobertura,
  ordenCobertura,
  onBusquedaCobertura,
  onOrdenCobertura,
  fmt,
}: {
  T: TemaUI;
  busquedaCobertura: string;
  equiposCobertura: Servicio[];
  ordenCobertura: 'reciente' | 'antiguo';
  onBusquedaCobertura: (v: string) => void;
  onOrdenCobertura: (v: 'reciente' | 'antiguo') => void;
  fmt: (n: number) => string;
}) {
  const [pagina, setPagina] = useState(1);

  // Vuelve a la página 1 cuando cambia la búsqueda o el orden — si no, se
  // podía quedar en una página que ya no existe para el nuevo resultado.
  useEffect(() => {
    setPagina(1);
  }, [busquedaCobertura, ordenCobertura]);

  const totalPaginas = Math.max(1, Math.ceil(equiposCobertura.length / PAGE_SIZE_COBERTURA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const equiposPagina = equiposCobertura.slice(
    (paginaSegura - 1) * PAGE_SIZE_COBERTURA,
    paginaSegura * PAGE_SIZE_COBERTURA
  );

  return (
    <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
      <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-1`}>
        <span className={`w-2 h-2 rounded-full ${T.dot}`} />
        Cobertura
      </h2>
      <p className="text-[10px] text-slate-500 mb-4">
        Garantía automática de 3 meses (equipo entregado + 3 meses) sobre todos los equipos ya entregados. Busca un cliente para acotar a su historial completo.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={busquedaCobertura}
          onChange={(e) => onBusquedaCobertura(e.target.value)}
          placeholder="🔍 Nombre o teléfono del cliente..."
          className={`flex-1 bg-slate-950/90 border ${T.searchBorde} rounded-xl px-4 py-2.5 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
        />
        <div className="flex gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onOrdenCobertura('reciente')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              ordenCobertura === 'reciente' ? T.filtroActivo : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Más reciente
          </button>
          <button
            type="button"
            onClick={() => onOrdenCobertura('antiguo')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              ordenCobertura === 'antiguo' ? T.filtroActivo : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Más antiguo
          </button>
        </div>
      </div>

      {equiposCobertura.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          {busquedaCobertura.trim()
            ? 'Ningún equipo entregado coincide con la búsqueda.'
            : 'No hay equipos entregados todavía.'}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {equiposPagina.map((s) => {
              const estado = calcularEstadoGarantia(s.garantia_vence_at);
              // Sin dato (no vigente NI vencida, simplemente nunca se
              // registró fecha de entrega) se distingue con un color
              // neutro — antes caía en el mismo rojo que "vencida".
              const colorFila = !estado
                ? 'bg-slate-800/20 border-slate-700/40'
                : estado.vigente
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-rose-500/5 border-rose-500/20';
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-3 flex-wrap border rounded-xl px-4 py-2.5 transition-colors ${colorFila}`}
                >
                  <div className="min-w-0">
                    <span className="text-slate-200 font-semibold text-sm">
                      {s.folio && <span className="text-slate-500 font-mono text-[10px] mr-1.5">{s.folio}</span>}
                      {s.modelo_equipo}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {s.clientes?.nombre || 'Sin cliente'} ·{' '}
                      {s.entregado_at
                        ? `entregado ${getFechaLocal(s.entregado_at)}`
                        : `creado ${getFechaLocal(s.created_at)} (sin fecha de entrega registrada)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <BadgeGarantia garantiaVenceAt={s.garantia_vence_at} />
                    <span className={`font-black text-sm ${T.fuerte}`}>{fmt(s.monto)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-500">
                Página {paginaSegura} de {totalPaginas} · {equiposCobertura.length} equipos
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura === totalPaginas}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function GarantiasTab(props: Props) {
  const [vista, setVista] = useState<'reclamos' | 'cobertura'>('cobertura');
  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl p-1 w-fit">
        <button
          type="button"
          onClick={() => setVista('reclamos')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            vista === 'reclamos' ? props.T.filtroActivo : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🛠️ Reclamos
        </button>
        <button
          type="button"
          onClick={() => setVista('cobertura')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            vista === 'cobertura' ? props.T.filtroActivo : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🛡️ Cobertura
        </button>
      </div>

      {vista === 'reclamos' ? (
        <GarantiasReclamos {...props} />
      ) : (
        <GarantiasCobertura
          T={props.T}
          busquedaCobertura={props.busquedaCobertura}
          equiposCobertura={props.equiposCobertura}
          ordenCobertura={props.ordenCobertura}
          onBusquedaCobertura={props.onBusquedaCobertura}
          onOrdenCobertura={props.onOrdenCobertura}
          fmt={props.fmt}
        />
      )}
    </div>
  );
}
