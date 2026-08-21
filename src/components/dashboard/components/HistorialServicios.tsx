import type { Servicio, TemaUI } from '../../../types';
import { getFechaLocal } from '../../../lib/date';
import { getImeiWarning } from '../../../lib/imei';
import { EstadoControl } from './EstadoControl';
import { EditorFechaPago } from './EditorFechaPago';
import { FiltrosEstadoPago } from './FiltrosEstadoPago';

interface Props {
  T: TemaUI;
  loading: boolean;
  /** Total de registros que calzan con los filtros (viene del servidor, no es serviciosPaginados.length). */
  totalFiltrados: number;
  serviciosPaginados: Servicio[];
  conteosPorEstado: { [estado: string]: number };
  conteosPorPagado: { pagado: number; sin_pagar: number };
  filtroFecha: string;
  filtroEstado: string;
  filtroPagado: 'todos' | 'pagado' | 'sin_pagar';
  busqueda: string;
  paginaActual: number;
  totalPaginas: number;
  editandoId: string | null;
  estadoMenuAbierto: string | null;
  editandoFechaPagoId: string | null;
  fechaPagoInput: string;
  accionId: string | null;
  fmt: (n: number) => string;
  botonFiltro: (activo: boolean) => string;
  onFiltroFecha: (v: string) => void;
  onFiltroEstado: (v: string) => void;
  onFiltroPagado: (v: 'todos' | 'pagado' | 'sin_pagar') => void;
  onBusqueda: (v: string) => void;
  onPagina: (fn: (p: number) => number) => void;
  onImprimirReporte: () => void;
  onToggleEstadoMenu: (id: string | null) => void;
  onCambiarEstado: (id: string, actual: string, nuevo: string) => void;
  onTogglePagado: (id: string, actual: boolean) => void;
  onAbrirEditorFecha: (s: Servicio) => void;
  onCerrarEditorFecha: () => void;
  onFechaPagoInput: (v: string) => void;
  onGuardarFechaPago: (id: string) => void;
  onIniciarEdicion: (s: Servicio) => void;
  onImprimirFolio: (s: Servicio) => void;
  onMarcarNoRealizado: (id: string) => void;
  onReactivar: (id: string) => void;
  onDelete: (id: string) => void;
}

export function HistorialServicios(props: Props) {
  const {
    T,
    loading,
    totalFiltrados,
    serviciosPaginados,
    conteosPorEstado,
    conteosPorPagado,
    filtroFecha,
    filtroEstado,
    filtroPagado,
    busqueda,
    paginaActual,
    totalPaginas,
    editandoId,
    estadoMenuAbierto,
    editandoFechaPagoId,
    fechaPagoInput,
    accionId,
    fmt,
    botonFiltro,
  } = props;

  return (
    <div className={`lg:col-span-2 min-w-0 bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
        <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${T.dot2}`} />
          Historial de Trabajos
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-44">
            <button type="button" onClick={() => props.onFiltroFecha('todos')} className={botonFiltro(filtroFecha === 'todos')}>
              Todos
            </button>
            <button type="button" onClick={() => props.onFiltroFecha('hoy')} className={botonFiltro(filtroFecha === 'hoy')}>
              Hoy
            </button>
            <button type="button" onClick={() => props.onFiltroFecha('mes')} className={botonFiltro(filtroFecha === 'mes')}>
              Mes
            </button>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => props.onBusqueda(e.target.value)}
            placeholder="🔍 Buscar folio, cliente, IMEI..."
            className={`w-full sm:w-72 bg-slate-950/90 border ${T.searchBorde} rounded-xl px-4 py-2.5 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={props.onImprimirReporte}
              title="Imprimir o guardar como PDF"
              className="flex-1 sm:flex-none bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all whitespace-nowrap"
            >
              🖨️ PDF
            </button>
          </div>
        </div>
      </div>

      <FiltrosEstadoPago
        T={T}
        filtroEstado={filtroEstado}
        filtroPagado={filtroPagado}
        conteosPorEstado={conteosPorEstado}
        conteosPorPagado={conteosPorPagado}
        onFiltroEstado={props.onFiltroEstado}
        onFiltroPagado={props.onFiltroPagado}
      />

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Cargando base de datos...</p>
      ) : totalFiltrados === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          No se encontraron registros que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="w-full">
          {/* Móvil */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {serviciosPaginados.map((s) => (
              <div
                key={s.id}
                className={`p-4 rounded-2xl bg-slate-950/60 border ${
                  editandoId === s.id ? T.filaMovilResaltada : 'border-slate-800'
                } flex flex-col gap-3 relative`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white text-base">
                      {s.folio && (
                        <span className={`${T.fuerte}/70 font-mono text-xs mr-2`}>{s.folio}</span>
                      )}
                      {s.clientes?.nombre || 'General'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{getFechaLocal(s.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-black ${T.fuerte} text-lg`}>
                      {s.es_revision && s.monto === 0 && !['COMPLETADO', 'ENTREGADO'].includes(s.estado)
                        ? 'Por definir'
                        : fmt(s.monto)}
                    </div>
                    <div className={`text-[10px] uppercase ${T.fuerte}/70 mt-1`}>
                      {s.clientes?.tipo_contacto === 'cliente' ? 'Cliente' : 'Técnico'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                  <span className="text-slate-200 block font-semibold text-sm mb-1">{s.modelo_equipo}</span>
                  {s.imei_serie && (
                    <span className={`text-[11px] ${T.fuerte}/80 font-mono tracking-tight block mb-2`}>
                      {s.imei_serie}
                      {getImeiWarning(s.imei_estado) && (
                        <span
                          title={getImeiWarning(s.imei_estado)!.texto}
                          className={`ml-1.5 ${getImeiWarning(s.imei_estado)!.clase}`}
                        >
                          {getImeiWarning(s.imei_estado)!.icono}
                        </span>
                      )}
                    </span>
                  )}
                  <div className={`${T.texto} font-medium text-sm flex items-center justify-between gap-2`}>
                    <div className="flex flex-col">
                      <span>
                        {s.tipo_trabajo}
                        {s.es_revision && (
                          <span
                            className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap text-amber-400 text-[10px] font-bold uppercase align-middle"
                            title={s.diagnostico || 'Revisión'}
                          >
                            <span aria-hidden>🔍</span> Revisión
                          </span>
                        )}
                      </span>
                      {s.metodo_pago && <span className="text-[10px] text-slate-500">{s.metodo_pago}</span>}
                      {s.es_revision && s.diagnostico && (
                        <span className="text-[10px] text-slate-400 mt-0.5 max-w-[180px]">{s.diagnostico}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <EstadoControl
                        s={s}
                        alinear="right"
                        abierto={estadoMenuAbierto === s.id}
                        onToggle={() =>
                          props.onToggleEstadoMenu(estadoMenuAbierto === s.id ? null : s.id)
                        }
                        onCerrar={() => props.onToggleEstadoMenu(null)}
                        onCambiar={(op) => props.onCambiarEstado(s.id, s.estado, op)}
                        disabled={accionId === s.id}
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={accionId === s.id}
                          onClick={() => props.onTogglePagado(s.id, s.pagado)}
                          className={`border px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                            s.pagado
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700'
                          }`}
                        >
                          {s.pagado ? '💰 Pagado' : 'Sin Pagar'}
                        </button>
                        <EditorFechaPago
                          abierto={editandoFechaPagoId === s.id}
                          fechaPagoInput={fechaPagoInput}
                          alinear="right"
                          onAbrir={() => props.onAbrirEditorFecha(s)}
                          onCerrar={props.onCerrarEditorFecha}
                          onChangeFecha={props.onFechaPagoInput}
                          onGuardar={() => props.onGuardarFechaPago(s.id)}
                          guardando={accionId === s.id}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 mt-1">
                  <button
                    type="button"
                    onClick={() => props.onIniciarEdicion(s)}
                    className={`flex-1 ${T.accionEditar} py-2.5 rounded-xl text-xs font-semibold`}
                  >
                    ✏️ Editar
                  </button>
                  {s.folio && (
                    <button
                      type="button"
                      onClick={() => props.onImprimirFolio(s)}
                      className="flex-1 text-slate-300 bg-slate-700/30 py-2.5 rounded-xl text-xs font-semibold"
                    >
                      🖨️ Ticket
                    </button>
                  )}
                  {s.estado === 'NO REALIZADO' ? (
                    <button
                      type="button"
                      disabled={accionId === s.id}
                      onClick={() => props.onReactivar(s.id)}
                      className="flex-1 text-amber-400 bg-amber-500/10 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
                    >
                      ↺ Activar
                    </button>
                  ) : (
                    s.estado !== 'ENTREGADO' && (
                      <button
                        type="button"
                        onClick={() => props.onMarcarNoRealizado(s.id)}
                        className="flex-1 text-orange-400 bg-orange-500/10 py-2.5 rounded-xl text-xs font-semibold"
                      >
                        ✕ Canc
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={accionId === s.id}
                    onClick={() => props.onDelete(s.id)}
                    className="flex-1 text-rose-400 bg-rose-500/10 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Escritorio */}
          <div className="hidden md:block overflow-x-auto pr-3">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Cliente / Fecha</th>
                  <th className="py-3 px-3">Equipo / IMEI</th>
                  <th className="py-3 px-3">Servicio</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Pagado</th>
                  <th className="py-3 px-3 text-right">Monto</th>
                  <th className="py-3 px-3 text-center min-w-48">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {serviciosPaginados.map((s) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-950/40 transition-colors ${
                      editandoId === s.id ? T.filaEscritorioResaltada : ''
                    }`}
                  >
                    <td className="py-3.5 px-3 font-medium">
                      <span className="text-white block">{s.clientes?.nombre || 'General'}</span>
                      <span className="block text-[10px] text-slate-400">{getFechaLocal(s.created_at)}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-slate-200 block font-semibold">{s.modelo_equipo}</span>
                      {s.imei_serie && (
                        <span className={`text-[10px] ${T.fuerte}/80 font-mono tracking-tight block`}>
                          {s.imei_serie}
                          {getImeiWarning(s.imei_estado) && (
                            <span
                              title={getImeiWarning(s.imei_estado)!.texto}
                              className={`ml-1.5 ${getImeiWarning(s.imei_estado)!.clase}`}
                            >
                              {getImeiWarning(s.imei_estado)!.icono}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className={`py-3.5 px-3 ${T.texto} font-medium`}>
                      {s.tipo_trabajo}
                      {s.es_revision && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap text-amber-400 text-[10px] font-bold uppercase align-middle"
                          title={s.diagnostico || 'Revisión'}
                        >
                          <span aria-hidden>🔍</span> Revisión
                        </span>
                      )}
                      {s.metodo_pago && (
                        <span className="block text-[10px] text-slate-500">{s.metodo_pago}</span>
                      )}
                      {s.es_revision && s.diagnostico && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">{s.diagnostico}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <EstadoControl
                        s={s}
                        alinear="left"
                        abierto={estadoMenuAbierto === s.id}
                        onToggle={() =>
                          props.onToggleEstadoMenu(estadoMenuAbierto === s.id ? null : s.id)
                        }
                        onCerrar={() => props.onToggleEstadoMenu(null)}
                        onCambiar={(op) => props.onCambiarEstado(s.id, s.estado, op)}
                        disabled={accionId === s.id}
                      />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={accionId === s.id}
                          onClick={() => props.onTogglePagado(s.id, s.pagado)}
                          title="Haz clic para marcar pagado/sin pagar"
                          className={`border px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                            s.pagado
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800/60 text-slate-400 border-slate-700'
                          }`}
                        >
                          {s.pagado ? '💰 Pagado' : 'Sin Pagar'}
                        </button>
                        <EditorFechaPago
                          abierto={editandoFechaPagoId === s.id}
                          fechaPagoInput={fechaPagoInput}
                          alinear="left"
                          onAbrir={() => props.onAbrirEditorFecha(s)}
                          onCerrar={props.onCerrarEditorFecha}
                          onChangeFecha={props.onFechaPagoInput}
                          onGuardar={() => props.onGuardarFechaPago(s.id)}
                          guardando={accionId === s.id}
                        />
                      </div>
                    </td>
                    <td className={`py-3.5 px-3 text-right font-black ${T.fuerte}`}>
                      {s.es_revision && s.monto === 0 && !['COMPLETADO', 'ENTREGADO'].includes(s.estado)
                        ? 'Por definir'
                        : fmt(s.monto)}
                    </td>
                    <td className="py-3.5 px-3 text-center min-w-48">
                      <div className="flex flex-col items-center gap-1">
                        {s.folio && (
                          <span className={`${T.fuerte}/70 font-mono text-[10px]`}>{s.folio}</span>
                        )}
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => props.onIniciarEdicion(s)}
                            title="Editar registro"
                            className={`${T.accionEditar} ${T.accionEditarHover} px-2 py-1 rounded-lg text-xs font-semibold transition-colors`}
                          >
                            ✏️
                          </button>
                          {s.folio && (
                            <button
                              type="button"
                              onClick={() => props.onImprimirFolio(s)}
                              title="Imprimir folio"
                              className="text-slate-300 hover:text-white bg-slate-700/30 hover:bg-slate-700/50 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                            >
                              🖨️
                            </button>
                          )}
                          {s.estado === 'NO REALIZADO' ? (
                            <button
                              type="button"
                              disabled={accionId === s.id}
                              onClick={() => props.onReactivar(s.id)}
                              title="Reactivar trabajo"
                              className="text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              ↺
                            </button>
                          ) : (
                            s.estado !== 'ENTREGADO' && (
                              <button
                                type="button"
                                onClick={() => props.onMarcarNoRealizado(s.id)}
                                title="Marcar como no realizado"
                                className="text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                              >
                                ✕
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => props.onDelete(s.id)}
                            title="Eliminar registro"
                            className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-500">
                Página {paginaActual} de {totalPaginas} · {totalFiltrados} registros
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => props.onPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={() => props.onPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-all"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
