import { useState } from 'react';
import type { Cliente, EquipoForm, TemaUI } from '../../../types';
import { mensajeImeiInvalido } from '../../../lib/validacion';
import { formatearMonto } from '../../../lib/moneda';
import type { SugerenciaPrecio } from '../../../lib/precioSugerido';

interface Props {
  T: TemaUI;
  editandoId: string | null;
  nombreCliente: string;
  telefonoCliente: string;
  tipoContacto: 'tecnico' | 'cliente';
  clienteIdAsociado: string | null;
  equipos: EquipoForm[];
  sugerencias: Cliente[];
  sugerenciasVisibles: boolean;
  escaneandoImei: number | null;
  guardando: boolean;
  onCambiarNombre: (v: string) => void;
  onFocusNombre: () => void;
  onBlurNombre: () => void;
  onSeleccionarCliente: (c: Cliente) => void;
  onTelefono: (v: string) => void;
  onTipoContacto: (t: 'tecnico' | 'cliente') => void;
  onCambiarEquipo: <K extends keyof EquipoForm>(idx: number, campo: K, valor: EquipoForm[K]) => void;
  onAgregarEquipo: () => void;
  onQuitarEquipo: (idx: number) => void;
  onEscanearImei: (idx: number, file: File) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancelarEdicion: () => void;
  /** Precio más frecuente cobrado para modelo+servicio, o null si no hay historial. */
  obtenerSugerenciaPrecio: (modelo: string, tipoTrabajo: string) => SugerenciaPrecio | null;
  /** Modelos ya usados (texto original) cuyo modelo normalizado calza con lo que se está escribiendo. */
  obtenerSugerenciasModelo: (texto: string) => string[];
}

export function FormularioServicio({
  T,
  editandoId,
  nombreCliente,
  telefonoCliente,
  tipoContacto,
  clienteIdAsociado,
  equipos,
  sugerencias,
  sugerenciasVisibles,
  escaneandoImei,
  guardando,
  onCambiarNombre,
  onFocusNombre,
  onBlurNombre,
  onSeleccionarCliente,
  onTelefono,
  onTipoContacto,
  onCambiarEquipo,
  onAgregarEquipo,
  onQuitarEquipo,
  onEscanearImei,
  onSubmit,
  onCancelarEdicion,
  obtenerSugerenciaPrecio,
  obtenerSugerenciasModelo,
}: Props) {
  // Cuál fila de equipo tiene el foco en "Modelo" ahora mismo — el
  // dropdown de sugerencias es puramente visual, no necesita vivir en
  // Dashboard.tsx.
  const [modeloFocoIdx, setModeloFocoIdx] = useState<number | null>(null);
  return (
    <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md h-fit transition-colors`}>
      <div className="flex justify-between items-center mb-5">
        <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${T.dot}`} />
          {editandoId ? 'Modificar Registro' : 'Registrar Trabajo'}
        </h2>
        {editandoId && (
          <button
            type="button"
            onClick={onCancelarEdicion}
            className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg uppercase tracking-wider hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Tipo de contacto
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onTipoContacto('tecnico')}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                tipoContacto === 'tecnico' ? T.toggleActivo : 'bg-slate-950/80 text-slate-400 border border-slate-800'
              }`}
            >
              Técnico
            </button>
            <button
              type="button"
              onClick={() => onTipoContacto('cliente')}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                tipoContacto === 'cliente' ? T.toggleActivo : 'bg-slate-950/80 text-slate-400 border border-slate-800'
              }`}
            >
              Cliente normal
            </button>
          </div>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Nombre del Cliente/Técnico
          </label>
          <input
            type="text"
            value={nombreCliente}
            onChange={(e) => onCambiarNombre(e.target.value)}
            onFocus={onFocusNombre}
            onBlur={onBlurNombre}
            required
            autoComplete="off"
            placeholder="Ej. Carlos / Willy"
            className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
          />
          {sugerenciasVisibles && sugerencias.length > 0 && (
            <div className={`absolute z-20 mt-1 w-full bg-slate-950 border ${T.sugerenciaBorde} rounded-xl overflow-hidden shadow-xl`}>
              {sugerencias.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => onSeleccionarCliente(c)}
                  className={`w-full text-left px-4 py-3 text-sm text-slate-200 ${T.sugerenciaHover} transition-colors flex justify-between items-center`}
                >
                  <span>{c.nombre}</span>
                  <span className="text-xs text-slate-500">
                    {c.tipo_contacto === 'cliente' ? 'Cliente' : 'Técnico'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {clienteIdAsociado && (
            <p className="text-[10px] text-emerald-400 mt-1">✓ Cliente existente seleccionado</p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            WhatsApp (Opcional)
          </label>
          <input
            type="tel"
            value={telefonoCliente}
            onChange={(e) => onTelefono(e.target.value.replace(/\s+/g, ''))}
            placeholder="Ej. +56912345678"
            className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
          />
        </div>

        {equipos.map((eq, idx) => {
          const warnImei = eq.imeiSerie.trim() ? mensajeImeiInvalido(eq.imeiSerie) : null;
          const tipoTrabajoFinalEq = eq.tipoTrabajo === 'Otros' ? eq.tipoTrabajoOtro.trim() : eq.tipoTrabajo;
          const comboListo = eq.modelo.trim() !== '' && tipoTrabajoFinalEq !== '';
          const sugerenciaPrecio = comboListo ? obtenerSugerenciaPrecio(eq.modelo, tipoTrabajoFinalEq) : null;
          return (
            <div key={idx} className="border border-slate-800 rounded-xl p-3 space-y-3 relative">
              {equipos.length > 1 && (
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Equipo {idx + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => onQuitarEquipo(idx)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                  >
                    ✕ Quitar
                  </button>
                </div>
              )}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Modelo del Equipo
                </label>
                <input
                  type="text"
                  value={eq.modelo}
                  onChange={(e) => onCambiarEquipo(idx, 'modelo', e.target.value)}
                  onFocus={() => setModeloFocoIdx(idx)}
                  onBlur={() => setTimeout(() => setModeloFocoIdx((v) => (v === idx ? null : v)), 150)}
                  required={idx === 0}
                  autoComplete="off"
                  placeholder="Ej. Xiaomi Redmi Note 12"
                  className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                />
                {modeloFocoIdx === idx && (() => {
                  const sugerenciasModelo = obtenerSugerenciasModelo(eq.modelo);
                  return sugerenciasModelo.length > 0 ? (
                    <div className={`absolute z-20 mt-1 w-full bg-slate-950 border ${T.sugerenciaBorde} rounded-xl overflow-hidden shadow-xl`}>
                      {sugerenciasModelo.map((modelo) => (
                        <button
                          type="button"
                          key={modelo}
                          onClick={() => {
                            onCambiarEquipo(idx, 'modelo', modelo);
                            setModeloFocoIdx(null);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm text-slate-200 ${T.sugerenciaHover} transition-colors`}
                        >
                          {modelo}
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  IMEI o N° de Serie (S/N)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={eq.imeiSerie}
                    onChange={(e) => onCambiarEquipo(idx, 'imeiSerie', e.target.value)}
                    placeholder="Ej. 864521049382101"
                    className={`w-full bg-slate-950/80 border rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all font-mono ${
                      warnImei ? 'border-amber-500/60' : 'border-slate-800'
                    }`}
                  />
                  <label
                    title="Escanear IMEI con la cámara"
                    className="flex-shrink-0 flex items-center justify-center w-12 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer active:bg-slate-800 transition-all"
                  >
                    {escaneandoImei === idx ? (
                      <span className="text-xs animate-pulse">⏳</span>
                    ) : (
                      <span className="text-lg">📷</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={escaneandoImei !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) onEscanearImei(idx, file);
                      }}
                    />
                  </label>
                </div>
                {warnImei && <p className="text-[10px] text-amber-400 mt-1">{warnImei}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Tipo de Servicio
                </label>
                <select
                  value={eq.tipoTrabajo}
                  onChange={(e) => onCambiarEquipo(idx, 'tipoTrabajo', e.target.value)}
                  className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                >
                  <option value="Cuenta Mi">Cuenta Mi</option>
                  <option value="Reparación IMEI">Reparación IMEI</option>
                  <option value="FRP">FRP</option>
                  <option value="Desbloqueo Red">Desbloqueo Red</option>
                  <option value="iCloud">iCloud</option>
                  <option value="Software General">Software General</option>
                  <option value="Otros">Otros</option>
                </select>
                {eq.tipoTrabajo === 'Otros' && (
                  <input
                    type="text"
                    value={eq.tipoTrabajoOtro}
                    onChange={(e) => onCambiarEquipo(idx, 'tipoTrabajoOtro', e.target.value)}
                    placeholder="Escribe el tipo de servicio"
                    className={`w-full mt-2 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                  />
                )}
              </div>
              {comboListo && sugerenciaPrecio && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400">
                      💡 Precio sugerido:{' '}
                      <span className="font-bold text-emerald-300">
                        {formatearMonto(sugerenciaPrecio.monto)}
                      </span>{' '}
                      ({sugerenciaPrecio.pct}% de {sugerenciaPrecio.total} caso
                      {sugerenciaPrecio.total === 1 ? '' : 's'})
                    </span>
                    <button
                      type="button"
                      onClick={() => onCambiarEquipo(idx, 'monto', String(sugerenciaPrecio.monto))}
                      className="flex-shrink-0 text-cyan-400 hover:text-cyan-300 font-bold uppercase text-[10px] tracking-wider"
                    >
                      Usar
                    </button>
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={eq.esRevision}
                  onChange={(e) => onCambiarEquipo(idx, 'esRevision', e.target.checked)}
                  className="w-4 h-4 accent-amber-400"
                />
                <span className="text-xs font-bold text-slate-300">
                  🔍 Es una revisión (el precio se define al terminar)
                </span>
              </label>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Monto ($)
                  {eq.esRevision && (
                    <span className="text-slate-500 font-normal"> — opcional por ahora</span>
                  )}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={eq.monto}
                  onChange={(e) => onCambiarEquipo(idx, 'monto', e.target.value)}
                  required={idx === 0 && !eq.esRevision}
                  placeholder={eq.esRevision ? 'Se define al terminar la revisión' : '0.00'}
                  className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                />
              </div>
              {tipoContacto === 'cliente' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Costo del repuesto ($)
                    <span className="text-slate-500 font-normal"> — opcional, para tu ganancia neta</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={eq.costoRepuesto}
                    onChange={(e) => onCambiarEquipo(idx, 'costoRepuesto', e.target.value)}
                    placeholder="Ej. 300000 (deja vacío si no hay repuesto)"
                    className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Método de Pago
                </label>
                <select
                  value={eq.metodoPago}
                  onChange={(e) => onCambiarEquipo(idx, 'metodoPago', e.target.value)}
                  className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Nota (opcional)
                </label>
                <textarea
                  value={eq.nota}
                  onChange={(e) => onCambiarEquipo(idx, 'nota', e.target.value)}
                  rows={2}
                  placeholder="Ej. respaldar contactos antes de flashear"
                  className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all resize-none`}
                />
              </div>
            </div>
          );
        })}

        {!editandoId && (
          <button
            type="button"
            onClick={onAgregarEquipo}
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-dashed border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all"
          >
            + Agregar otro equipo (mismo cliente)
          </button>
        )}
        <button
          type="submit"
          disabled={guardando}
          className={`w-full py-3.5 md:py-3 rounded-xl text-xs md:text-sm uppercase tracking-wider font-black transition-all mt-2 disabled:opacity-60 ${
            editandoId
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
              : T.submit
          }`}
        >
          {guardando ? 'Guardando…' : editandoId ? 'Actualizar Cambios' : 'Guardar Servicio'}
        </button>
      </form>
    </div>
  );
}
