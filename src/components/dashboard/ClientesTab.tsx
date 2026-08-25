import type { Servicio, TemaUI } from '../../types';
import { getFechaLocal } from '../../lib/date';

interface RankingDinero {
  nombre: string;
  dinero: number;
  visitas: number;
}

interface RankingTipo {
  tipo: string;
  dinero: number;
  trabajos: number;
  avgHoras: number | null;
}

interface GrupoClienteHistorial {
  nombre: string;
  telefono?: string;
  trabajos: Servicio[];
}

const ESTADO_BADGE: { [estado: string]: string } = {
  PENDIENTE: 'bg-slate-700/50 text-slate-300 border-slate-600',
  'EN PROCESO': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  COMPLETADO: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  ENTREGADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'NO REALIZADO': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
};

interface Props {
  T: TemaUI;
  filtroFechaClientes: string;
  filtroTipoContacto: 'todos' | 'tecnico' | 'cliente';
  rankingPorDinero: RankingDinero[];
  rankingPorVisitas: RankingDinero[];
  rankingPorTipoTrabajo: RankingTipo[];
  totalClientesUnicos: number;
  totalTrabajosClientesTab: number;
  totalDineroClientesTab: number;
  tiempoPromedioHoras: number | null;
  /** Texto de búsqueda por cliente (nombre o teléfono) — trae TODO su historial, sin filtro de periodo. */
  busquedaCliente: string;
  resultadosBusquedaCliente: GrupoClienteHistorial[];
  onBusquedaCliente: (v: string) => void;
  fmt: (n: number) => string;
  botonFiltro: (activo: boolean) => string;
  onFiltroFecha: (v: string) => void;
  onFiltroTipo: (v: 'todos' | 'tecnico' | 'cliente') => void;
}

export function ClientesTab({
  T,
  filtroFechaClientes,
  filtroTipoContacto,
  rankingPorDinero,
  rankingPorVisitas,
  rankingPorTipoTrabajo,
  totalClientesUnicos,
  totalTrabajosClientesTab,
  totalDineroClientesTab,
  tiempoPromedioHoras,
  busquedaCliente,
  resultadosBusquedaCliente,
  onBusquedaCliente,
  fmt,
  botonFiltro,
  onFiltroFecha,
  onFiltroTipo,
}: Props) {
  return (
    <div className="space-y-6">
      <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
        <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-4`}>
          <span className={`w-2 h-2 rounded-full ${T.dot}`} />
          Buscar cliente
        </h2>
        <input
          type="text"
          value={busquedaCliente}
          onChange={(e) => onBusquedaCliente(e.target.value)}
          placeholder="🔍 Nombre o teléfono del cliente..."
          className={`w-full bg-slate-950/90 border ${T.searchBorde} rounded-xl px-4 py-2.5 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
        />

        {busquedaCliente.trim() && (
          <div className="mt-4 space-y-4">
            {resultadosBusquedaCliente.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Ningún cliente coincide con la búsqueda.</p>
            ) : (
              resultadosBusquedaCliente.map((g) => (
                <div key={g.nombre} className="border border-slate-800/80 rounded-2xl p-4 bg-slate-950/30">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div>
                      <span className={`font-bold text-sm ${T.texto}`}>👤 {g.nombre}</span>
                      {g.telefono && <span className="ml-2 text-[11px] text-slate-500">{g.telefono}</span>}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800/60 border border-slate-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {g.trabajos.length} {g.trabajos.length === 1 ? 'trabajo' : 'trabajos'} · {fmt(g.trabajos.reduce((a, s) => a + (s.monto || 0), 0))}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {g.trabajos.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 bg-slate-900/60 rounded-lg px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="text-slate-200 font-semibold truncate">
                            {s.folio && <span className="text-slate-500 font-mono text-[10px] mr-1.5">{s.folio}</span>}
                            {s.modelo_equipo}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {s.tipo_trabajo} · {getFechaLocal(s.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                              ESTADO_BADGE[s.estado] || 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {s.estado}
                          </span>
                          <span className={`font-black ${T.fuerte}`}>{fmt(s.monto)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
        <div className="flex flex-col md:flex-row gap-5 md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Periodo</p>
            <div className="grid grid-cols-3 gap-2 w-full md:w-72">
              <button type="button" onClick={() => onFiltroFecha('todos')} className={botonFiltro(filtroFechaClientes === 'todos')}>
                Todos
              </button>
              <button type="button" onClick={() => onFiltroFecha('hoy')} className={botonFiltro(filtroFechaClientes === 'hoy')}>
                Hoy
              </button>
              <button type="button" onClick={() => onFiltroFecha('mes')} className={botonFiltro(filtroFechaClientes === 'mes')}>
                Este Mes
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de contacto</p>
            <div className="grid grid-cols-3 gap-2 w-full md:w-80">
              <button type="button" onClick={() => onFiltroTipo('todos')} className={botonFiltro(filtroTipoContacto === 'todos')}>
                Todos
              </button>
              <button type="button" onClick={() => onFiltroTipo('tecnico')} className={botonFiltro(filtroTipoContacto === 'tecnico')}>
                Técnicos
              </button>
              <button type="button" onClick={() => onFiltroTipo('cliente')} className={botonFiltro(filtroTipoContacto === 'cliente')}>
                Clientes
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Clientes Únicos', value: String(totalClientesUnicos) },
          { label: 'Trabajos Realizados', value: String(totalTrabajosClientesTab) },
          { label: 'Dinero Generado', value: fmt(totalDineroClientesTab) },
          {
            label: 'Tiempo Promedio Reparación',
            value: tiempoPromedioHoras !== null ? `${tiempoPromedioHoras.toFixed(1)}h` : '—',
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md text-center transition-colors`}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{card.label}</p>
            <p className={`text-2xl font-black ${T.texto}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className={`bg-slate-900/80 border ${T.borde} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
          <h3 className={`text-xs font-bold ${T.texto} uppercase tracking-widest mb-3`}>💎 Top por Dinero</h3>
          <div className="space-y-2">
            {rankingPorDinero.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
            ) : (
              rankingPorDinero.map((data, idx) => (
                <div
                  key={data.nombre}
                  className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs"
                >
                  <span className="font-semibold text-slate-300">
                    #{idx + 1} {data.nombre}{' '}
                    <span className="text-[10px] text-slate-500">({data.visitas} t.)</span>
                  </span>
                  <span className={`font-black ${T.fuerte}`}>{fmt(data.dinero)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`bg-slate-900/80 border ${T.borde2} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
          <h3 className={`text-xs font-bold ${T.texto2} uppercase tracking-widest mb-3`}>
            🔁 Top por Cantidad de Trabajos
          </h3>
          <div className="space-y-2">
            {rankingPorVisitas.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
            ) : (
              rankingPorVisitas.map((data, idx) => (
                <div
                  key={data.nombre}
                  className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs"
                >
                  <span className="font-semibold text-slate-300">
                    #{idx + 1} {data.nombre}
                  </span>
                  <span className={`font-black ${T.fuerte2}`}>
                    {data.visitas} t. ({fmt(data.dinero)})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`bg-slate-900/80 border ${T.borde3} p-5 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
          <h3 className={`text-xs font-bold ${T.texto3} uppercase tracking-widest mb-3`}>🔧 Por Tipo de Trabajo</h3>
          <div className="space-y-2">
            {rankingPorTipoTrabajo.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No hay datos en este periodo.</p>
            ) : (
              rankingPorTipoTrabajo.map((data, idx) => (
                <div
                  key={data.tipo}
                  className="flex justify-between items-center bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-xs"
                >
                  <span className="font-semibold text-slate-300">
                    #{idx + 1} {data.tipo}
                  </span>
                  <span className="text-right">
                    <span className={`font-black ${T.fuerte3} block`}>
                      {data.trabajos} eq. ({fmt(data.dinero)})
                    </span>
                    {data.avgHoras !== null && (
                      <span className="text-[10px] text-slate-500">⏱ {data.avgHoras.toFixed(1)}h promedio</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
