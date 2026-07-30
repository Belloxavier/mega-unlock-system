import type { Servicio } from '../../types';
import type { Tema } from '../../lib/theme';
import { OPERADORAS_IMEI } from '../../lib/imei';

interface ImeiTabProps {
  T: Tema;
  imeisPendientes: Servicio[];
  imeiCopiadoId: string | null;
  handleAbrirVerificadorImei: (url: string) => void;
  handleCopiarImei: (id: string, imei: string) => void;
  handleMarcarImeiEstado: (id: string, estado: 'limpio' | 'reportado' | 'bloqueado') => void;
}

// Pestaña "IMEI": accesos directos a las 4 operadoras + lista de trabajos
// con un IMEI real cargado que todavía no se ha verificado.
export function ImeiTab({
  T,
  imeisPendientes,
  imeiCopiadoId,
  handleAbrirVerificadorImei,
  handleCopiarImei,
  handleMarcarImeiEstado,
}: ImeiTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
      <div className="space-y-6 lg:col-span-1">
        <div className={`bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
          <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-3`}>
            <span className={`w-2 h-2 rounded-full ${T.dot}`}></span>
            Verificador IMEI
          </h2>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            No existe una API pública en Chile para esto — cada operadora tiene su propio formulario manual. Abre el sitio, copia el IMEI de la lista y pégalo allá.
          </p>
          <div className="space-y-2.5">
            {OPERADORAS_IMEI.map((op) => (
              <button
                key={op.nombre}
                type="button"
                onClick={() => handleAbrirVerificadorImei(op.url)}
                className="group w-full flex items-center gap-3 bg-slate-950/60 border border-slate-800 hover:border-slate-600 p-3 rounded-xl transition-all active:scale-[0.98] hover:bg-slate-950"
              >
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                  style={{ backgroundColor: op.hex, boxShadow: `0 0 12px ${op.hex}66` }}
                >
                  {op.nombre[0]}
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-bold text-slate-100">{op.nombre}</span>
                  <span className="block text-[10px] text-slate-500">Consultar IMEI</span>
                </span>
                <span className="text-slate-600 group-hover:text-slate-300 transition-colors text-base flex-shrink-0">↗</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
            En computador se abren a un lado de la pantalla. En el celular se abren en una pestaña nueva — la barra de direcciones no se puede ni se debe ocultar (por seguridad del navegador).
          </p>
        </div>
      </div>

      <div className={`lg:col-span-2 bg-slate-900/80 border ${T.borde} p-5 md:p-6 rounded-2xl shadow-xl backdrop-blur-md transition-colors`}>
        <h2 className={`text-base font-bold ${T.texto} uppercase tracking-wider flex items-center gap-2 mb-5`}>
          <span className={`w-2 h-2 rounded-full ${T.dot2}`}></span>
          Pendientes de Verificar ({imeisPendientes.length})
        </h2>

        {imeisPendientes.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No hay IMEI pendientes de verificar. 🎉</p>
        ) : (
          <div className="space-y-3">
            {imeisPendientes.map((s) => (
              <div key={s.id} className="border border-slate-800 bg-slate-950/60 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">
                      {s.folio && <span className={`${T.fuerte} font-mono mr-1.5`}>{s.folio}</span>}
                      {s.clientes?.nombre || 'General'} · {s.modelo_equipo}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono font-black text-white text-base tracking-wide break-all">{s.imei_serie}</span>
                      <button
                        type="button"
                        onClick={() => handleCopiarImei(s.id, s.imei_serie || '')}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${imeiCopiadoId === s.id ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/60 text-slate-300 border-slate-700'}`}
                      >
                        {imeiCopiadoId === s.id ? '✓ Copiado' : '📋 Copiar'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMarcarImeiEstado(s.id, 'limpio')}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all"
                    >
                      Limpio
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarcarImeiEstado(s.id, 'reportado')}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all"
                    >
                      Reportado
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarcarImeiEstado(s.id, 'bloqueado')}
                      className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all"
                    >
                      Bloqueado
                    </button>
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
