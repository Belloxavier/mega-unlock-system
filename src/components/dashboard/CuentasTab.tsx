import type { CuentaBancaria, cuentaVacia } from '../../types';
import type { Tema } from '../../lib/theme';

interface CuentasTabProps {
  T: Tema;
  cuentasList: CuentaBancaria[];
  formCuenta: ReturnType<typeof cuentaVacia>;
  setFormCuenta: React.Dispatch<React.SetStateAction<ReturnType<typeof cuentaVacia>>>;
  editandoCuentaId: string | null;
  limpiarFormularioCuenta: () => void;
  handleGuardarCuenta: (e: React.FormEvent) => void;
  handleEditarCuenta: (c: CuentaBancaria) => void;
  handleEliminarCuenta: (id: string) => void;
}

// Pestaña "Cuentas": administra las cuentas bancarias que se muestran en la
// página pública /pago (enlazada desde el WhatsApp de "equipo listo").
export function CuentasTab({
  T,
  cuentasList,
  formCuenta,
  setFormCuenta,
  editandoCuentaId,
  limpiarFormularioCuenta,
  handleGuardarCuenta,
  handleEditarCuenta,
  handleEliminarCuenta,
}: CuentasTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
      <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md h-fit transition-colors`}>
        <div className="flex justify-between items-center mb-5">
          <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full ${T.dot}`}></span>
            {editandoCuentaId ? 'Editar Cuenta' : 'Agregar Cuenta'}
          </h2>
          {editandoCuentaId && (
            <button onClick={limpiarFormularioCuenta} className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg uppercase tracking-wider hover:bg-slate-700 transition-colors">Cancelar</button>
          )}
        </div>
        <form onSubmit={handleGuardarCuenta} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Banco</label>
            <input
              type="text"
              value={formCuenta.banco}
              onChange={(e) => setFormCuenta((f) => ({ ...f, banco: e.target.value }))}
              required
              placeholder="Ej. BancoEstado"
              className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Cuenta</label>
            <select
              value={formCuenta.tipoCuenta}
              onChange={(e) => setFormCuenta((f) => ({ ...f, tipoCuenta: e.target.value }))}
              className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
            >
              <option value="Cuenta Corriente">Cuenta Corriente</option>
              <option value="Cuenta Vista">Cuenta Vista</option>
              <option value="Cuenta RUT">Cuenta RUT</option>
              <option value="Cuenta de Ahorro">Cuenta de Ahorro</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">N° de Cuenta</label>
            <input
              type="text"
              inputMode="numeric"
              value={formCuenta.numeroCuenta}
              onChange={(e) => setFormCuenta((f) => ({ ...f, numeroCuenta: e.target.value }))}
              required
              placeholder="Ej. 12345678901"
              className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all font-mono`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Titular</label>
            <input
              type="text"
              value={formCuenta.titular}
              onChange={(e) => setFormCuenta((f) => ({ ...f, titular: e.target.value }))}
              required
              placeholder="Nombre completo"
              className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">RUT (opcional)</label>
            <input
              type="text"
              value={formCuenta.rut}
              onChange={(e) => setFormCuenta((f) => ({ ...f, rut: e.target.value }))}
              placeholder="Ej. 12.345.678-9"
              className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email (opcional)</label>
            <input
              type="email"
              value={formCuenta.email}
              onChange={(e) => setFormCuenta((f) => ({ ...f, email: e.target.value }))}
              placeholder="Para transferencias por email"
              className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-base md:text-sm text-white focus:outline-none ${T.focoInput} transition-all`}
            />
          </div>
          <button type="submit" className={`w-full py-3.5 md:py-3 rounded-xl text-xs md:text-sm uppercase tracking-wider font-black transition-all ${editandoCuentaId ? 'bg-amber-400 hover:bg-amber-300 text-slate-950' : T.submit}`}>
            {editandoCuentaId ? 'Actualizar Cuenta' : 'Agregar Cuenta'}
          </button>
        </form>
      </div>

      <div className={`lg:col-span-2 bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full ${T.dot2}`}></span>
            Cuentas Publicadas ({cuentasList.length})
          </h2>
          <a
            href="/pago"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold uppercase tracking-wider bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-all text-center"
          >
            🔗 Ver página pública ↗
          </a>
        </div>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Esta lista se manda tal cual en el link de WhatsApp cuando marcas un trabajo "Completado" — actualízala aquí cuando cambie algo, no hace falta avisarle a nadie de nuevo.
        </p>

        {cuentasList.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Todavía no agregas ninguna cuenta.</p>
        ) : (
          <div className="space-y-3">
            {cuentasList.map((c) => (
              <div key={c.id} className={`border border-slate-800 bg-slate-950/60 rounded-xl p-4 ${editandoCuentaId === c.id ? 'border-amber-500/50' : ''}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">{c.banco}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${T.fuerte} bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-lg`}>{c.tipo_cuenta}</span>
                    </div>
                    <div className="font-mono text-sm text-slate-200 mt-1 break-all">{c.numero_cuenta}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.titular}{c.rut ? ` · ${c.rut}` : ''}</div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => handleEditarCuenta(c)} className={`${T.accionEditar} ${T.accionEditarHover} px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors`}>✏️</button>
                    <button onClick={() => handleEliminarCuenta(c.id)} className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
