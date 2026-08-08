import { useMemo, useState } from 'react';
import type { Servicio, TemaUI } from '../../types';
import { ETIQUETA_DIFICULTAD, MIN_MUESTRAS_DIFICULTAD, type EstimacionDificultad } from '../../lib/dificultad';
import { formatearDuracionMin } from '../../lib/tiempo';
import { normalizarTexto } from '../../lib/normalizarTexto';
import { NotaPopover } from './components/NotaPopover';
import { TrabajoTiempoControl, type AvisoOlvidado } from './components/TrabajoTiempoControl';
import { EstadoControl } from './components/EstadoControl';
import { FiltrosEstadoPago } from './components/FiltrosEstadoPago';

export interface GrupoClienteActivo {
  nombre: string;
  telefono?: string;
  trabajos: Servicio[];
}

interface Props {
  T: TemaUI;
  loading: boolean;
  /** Total de registros que calzan con los filtros (viene del servidor, no es serviciosPaginados.length). */
  totalFiltrados: number;
  serviciosPaginados: Servicio[];
  /** PENDIENTE/EN PROCESO agrupados por cliente (de la tabla completa en memoria) — para la vista "Agrupar por cliente". */
  trabajosActivosAgrupados: GrupoClienteActivo[];
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

interface TrabajoCardProps {
  s: Servicio;
  T: TemaUI;
  mostrarCliente: boolean;
  accionId: string | null;
  trabajosOlvidados: { [id: string]: AvisoOlvidado };
  estadoMenuAbierto: string | null;
  dificultad: EstimacionDificultad | null;
  onToggleEstadoMenu: (id: string | null) => void;
  onCambiarEstado: (id: string, actual: string, nuevo: string) => void;
  onIniciarTrabajo: (id: string) => void;
  onFinalizarTrabajo: (id: string) => void;
  onSilenciarAvisoOlvidado: (id: string) => void;
  onCorregirHoraTrabajo: (id: string) => void;
  onToggleTiempoValido: (id: string, actual: boolean) => void;
}

// Una sola tarjeta de trabajo — compartida por la vista normal (grid 2
// columnas) y la vista agrupada por cliente (lista dentro de cada grupo),
// para no mantener el mismo bloque de JSX (estado, tiempo, dificultad)
// duplicado en dos lugares.
function TrabajoCard({
  s,
  T,
  mostrarCliente,
  accionId,
  trabajosOlvidados,
  estadoMenuAbierto,
  dificultad,
  onToggleEstadoMenu,
  onCambiarEstado,
  onIniciarTrabajo,
  onFinalizarTrabajo,
  onSilenciarAvisoOlvidado,
  onCorregirHoraTrabajo,
  onToggleTiempoValido,
}: TrabajoCardProps) {
  return (
    <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="font-bold text-white text-sm truncate">
            {s.folio && <span className={`${T.fuerte}/70 font-mono text-xs mr-2`}>{s.folio}</span>}
            {s.modelo_equipo}
          </div>
          {mostrarCliente && (
            <div className="text-[11px] text-slate-500 truncate mt-0.5">👤 {s.clientes?.nombre || 'Sin cliente'}</div>
          )}
          <div className="text-xs text-slate-400 mt-0.5 flex items-center flex-wrap">
            {s.tipo_trabajo}
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
            ⏱️ {ETIQUETA_DIFICULTAD[dificultad.nivel].icono} {ETIQUETA_DIFICULTAD[dificultad.nivel].texto} · típico{' '}
            {formatearDuracionMin(dificultad.tiempoTipicoMinutos)} ({dificultad.muestras} casos)
          </>
        ) : (
          <>🧠 Dificultad: aprendiendo (menos de {MIN_MUESTRAS_DIFICULTAD} casos con tiempo real)</>
        )}
      </p>
    </div>
  );
}

// Vista de producción: qué se está haciendo o se hizo en cada equipo. Usa
// exactamente los mismos filtros/estado que Inicio (Dashboard.tsx) — filtrar
// acá se refleja allá y viceversa, sin ninguna lógica de filtrado propia.
export function AreaTrabajoTab({
  T,
  loading,
  totalFiltrados,
  serviciosPaginados,
  trabajosActivosAgrupados,
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
  const [vistaAgrupada, setVistaAgrupada] = useState(false);
  const [busquedaAgrupada, setBusquedaAgrupada] = useState('');

  const gruposFiltrados = useMemo(() => {
    const q = normalizarTexto(busquedaAgrupada.trim());
    if (!q) return trabajosActivosAgrupados;
    return trabajosActivosAgrupados
      .map((g) => {
        const nombreCalza = normalizarTexto(g.nombre).includes(q);
        const trabajos = nombreCalza
          ? g.trabajos
          : g.trabajos.filter((s) =>
              [s.folio, s.modelo_equipo, s.tipo_trabajo].some((v) => v && normalizarTexto(v).includes(q))
            );
        return { ...g, trabajos };
      })
      .filter((g) => g.trabajos.length > 0);
  }, [trabajosActivosAgrupados, busquedaAgrupada]);

  const totalActivos = trabajosActivosAgrupados.reduce((a, g) => a + g.trabajos.length, 0);

  const trabajoCardProps = {
    T,
    accionId,
    trabajosOlvidados,
    estadoMenuAbierto,
    onToggleEstadoMenu,
    onCambiarEstado,
    onIniciarTrabajo,
    onFinalizarTrabajo,
    onSilenciarAvisoOlvidado,
    onCorregirHoraTrabajo,
    onToggleTiempoValido,
  };

  return (
    <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
        <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${T.dot}`} />
          Área de Trabajo
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {!vistaAgrupada && (
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
          )}
          <input
            type="text"
            value={vistaAgrupada ? busquedaAgrupada : busqueda}
            onChange={(e) => (vistaAgrupada ? setBusquedaAgrupada(e.target.value) : onBusqueda(e.target.value))}
            placeholder={vistaAgrupada ? '🔍 Buscar cliente, folio, modelo...' : '🔍 Buscar folio, cliente, modelo...'}
            className={`w-full sm:w-72 bg-slate-950/90 border ${T.searchBorde} rounded-xl px-4 py-2.5 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
          />
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setVistaAgrupada((v) => !v)}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
            vistaAgrupada ? T.filtroActivo + ' border-transparent' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-600'
          }`}
        >
          {vistaAgrupada ? `👥 Agrupado por cliente (${totalActivos})` : '👥 Agrupar por cliente'}
        </button>
      </div>

      {vistaAgrupada ? (
        <>
          <p className="text-[10px] text-slate-500 mb-4">
            Solo trabajos PENDIENTE o EN PROCESO — lo que ya entregaste no aparece acá.
          </p>
          {trabajosActivosAgrupados.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No tienes trabajos pendientes ni en proceso. 🎉</p>
          ) : gruposFiltrados.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Ningún cliente activo coincide con la búsqueda.</p>
          ) : (
            <div className="space-y-5">
              {gruposFiltrados.map((g) => (
                <div key={g.nombre} className="border border-slate-800/80 rounded-2xl p-4 bg-slate-950/30">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`font-bold text-sm ${T.texto}`}>👤 {g.nombre}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800/60 border border-slate-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {g.trabajos.length} {g.trabajos.length === 1 ? 'trabajo' : 'trabajos'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {g.trabajos.map((s) => {
                      const dificultad = obtenerEstimacionDificultad(s.modelo_equipo, s.tipo_trabajo);
                      return <TrabajoCard key={s.id} s={s} dificultad={dificultad} mostrarCliente={false} {...trabajoCardProps} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <FiltrosEstadoPago
            T={T}
            filtroEstado={filtroEstado}
            filtroPagado={filtroPagado}
            conteosPorEstado={conteosPorEstado}
            conteosPorPagado={conteosPorPagado}
            onFiltroEstado={onFiltroEstado}
            onFiltroPagado={onFiltroPagado}
          />

          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">Cargando base de datos...</p>
          ) : totalFiltrados === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No se encontraron trabajos que coincidan con la búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serviciosPaginados.map((s) => {
                const dificultad = obtenerEstimacionDificultad(s.modelo_equipo, s.tipo_trabajo);
                return <TrabajoCard key={s.id} s={s} dificultad={dificultad} mostrarCliente {...trabajoCardProps} />;
              })}
            </div>
          )}

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-500">
                Página {paginaActual} de {totalPaginas} · {totalFiltrados} trabajos
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
        </>
      )}
    </div>
  );
}
