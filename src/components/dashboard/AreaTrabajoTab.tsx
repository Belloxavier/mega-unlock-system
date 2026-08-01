import type { Servicio, TemaUI } from '../../types';
import { ETIQUETA_DIFICULTAD, MIN_MUESTRAS_DIFICULTAD, type EstimacionDificultad } from '../../lib/dificultad';
import { formatearDuracionMin } from '../../lib/tiempo';
import { NotaPopover } from './components/NotaPopover';
import { TrabajoTiempoControl, type AvisoOlvidado } from './components/TrabajoTiempoControl';
import { EstadoControl } from './components/EstadoControl';
import { FiltrosEstadoPago } from './components/FiltrosEstadoPago';

interface Props {
  T: TemaUI;
  serviciosFiltrados: Servicio[];
  serviciosPaginados: Servicio[];
  conteosPorEstado: { [estado: string]: number };
  conteosPorPagado: { pagado: number; sin_pagar: number };
  filtroFecha: string;
  filtroEstado: string;
  filtroPagado: 'todos' | 'pagado' | 'sin_pagar';
  busqueda: string;
  paginaActual: number;
  totalPaginas: number;
  accionId: string | null;
  trabajosOlvidados: { [id: string]: AvisoOlvidado };
  estadoMenuAbierto: string | null;
  botonFiltro: (activo: boolean) => string;
  onFiltroFecha: (v: string) => void;
  onFiltroEstado: (v: string) => void;
  onFiltroPagado: (v: 'todos' | 'pagado' | 'sin_pagar') => void;
  onBusqueda: (v: string) => void;
  onPagina: (fn: (p: number) => number) => void;
  onIniciarTrabajo: (id: string) => void;
  onFinalizarTrabajo: (id: string) => void;
  onSilenciarAvisoOlvidado: (id: string) => void;
  onCorregirHoraTrabajo: (id: string) => void;
  onToggleTiempoValido: (id: string, actual: boolean) => void;
  onToggleEstadoMenu: (id: string | null) => void;
  onCambiarEstado: (id: string, actual: string, nuevo: string) => void;
  obtenerEstimacionDificultad: (modelo: string, tipoTrabajo: string) => EstimacionDificultad | null;
}

// Vista de producción: qué se está haciendo o se hizo en cada equipo. Usa
// exactamente los mismos filtros/estado que Inicio (Dashboard.tsx) — filtrar
// acá se refleja allá y viceversa, sin ninguna lógica de filtrado propia.
export function AreaTrabajoTab({
  T,
  serviciosFiltrados,
  serviciosPaginados,
  conteosPorEstado,
  conteosPorPagado,
  filtroFecha,
  filtroEstado,
  filtroPagado,
  busqueda,
  paginaActual,
  totalPaginas,
  accionId,
  trabajosOlvidados,
  estadoMenuAbierto,
  botonFiltro,
  onFiltroFecha,
  onFiltroEstado,
  onFiltroPagado,
  onBusqueda,
  onPagina,
  onIniciarTrabajo,
  onFinalizarTrabajo,
  onSilenciarAvisoOlvidado,
  onCorregirHoraTrabajo,
  onToggleTiempoValido,
  onToggleEstadoMenu,
  onCambiarEstado,
  obtenerEstimacionDificultad,
}: Props) {
  return (
    <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
        <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${T.dot}`} />
          Área de Trabajo
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-44">
            <button type="button" onClick={() => onFiltroFecha('todos')} className={botonFiltro(filtroFecha === 'todos')}>
              Todos
            </button>
            <button type="button" onClick={() => onFiltroFecha('hoy')} className={botonFiltro(filtroFecha === 'hoy')}>
              Hoy
            </button>
            <button type="button" onClick={() => onFiltroFecha('mes')} className={botonFiltro(filtroFecha === 'mes')}>
              Mes
            </button>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="🔍 Buscar folio, cliente, modelo..."
            className={`w-full sm:w-72 bg-slate-950/90 border ${T.searchBorde} rounded-xl px-4 py-2.5 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
          />
        </div>
      </div>

      <FiltrosEstadoPago
        T={T}
        filtroEstado={filtroEstado}
        filtroPagado={filtroPagado}
        conteosPorEstado={conteosPorEstado}
        conteosPorPagado={conteosPorPagado}
        onFiltroEstado={onFiltroEstado}
        onFiltroPagado={onFiltroPagado}
      />

      {serviciosFiltrados.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          No se encontraron trabajos que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {serviciosPaginados.map((s) => {
            const tipoTrabajoActual = s.tipo_trabajo;
            const dificultad = obtenerEstimacionDificultad(s.modelo_equipo, tipoTrabajoActual);
            return (
              <div key={s.id} className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm truncate">
                      {s.folio && <span className={`${T.fuerte}/70 font-mono text-xs mr-2`}>{s.folio}</span>}
                      {s.modelo_equipo}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center flex-wrap">
                      {tipoTrabajoActual}
                      {s.nota && <NotaPopover nota={s.nota} alinear="left" />}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <EstadoControl
                      s={s}
                      alinear="right"
                      abierto={estadoMenuAbierto === s.id}
                      onToggle={() => onToggleEstadoMenu(estadoMenuAbierto === s.id ? null : s.id)}
                      onCerrar={() => onToggleEstadoMenu(null)}
                      onCambiar={(op) => onCambiarEstado(s.id, s.estado, op)}
                      disabled={accionId === s.id}
                    />
                    <TrabajoTiempoControl
                      s={s}
                      disabled={accionId === s.id}
                      avisoOlvidado={trabajosOlvidados[s.id]}
                      onIniciar={onIniciarTrabajo}
                      onFinalizar={onFinalizarTrabajo}
                      onSilenciarAviso={onSilenciarAvisoOlvidado}
                      onCorregirHora={onCorregirHoraTrabajo}
                      onToggleValidez={onToggleTiempoValido}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                  {dificultad ? (
                    <>
                      ⏱️ {ETIQUETA_DIFICULTAD[dificultad.nivel].icono} {ETIQUETA_DIFICULTAD[dificultad.nivel].texto} ·
                      típico {formatearDuracionMin(dificultad.tiempoTipicoMinutos)} ({dificultad.muestras} casos)
                    </>
                  ) : (
                    <>🧠 Dificultad: aprendiendo (menos de {MIN_MUESTRAS_DIFICULTAD} casos con tiempo real)</>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-500">
            Página {paginaActual} de {totalPaginas} · {serviciosFiltrados.length} trabajos
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPagina((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => onPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
