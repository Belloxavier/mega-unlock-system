import type { Servicio } from '../../../types';
import { tieneTelefonoValido } from '../../../lib/phone';

interface GrupoAviso {
  nombre: string;
  telefono?: string;
  trabajos: Servicio[];
}

interface Props {
  grupos: { [clave: string]: GrupoAviso };
  onAvisar: (telefono: string | undefined, trabajos: Servicio[]) => void;
  /** Estado abierto/cerrado vive en Dashboard.tsx para sobrevivir cambios de pestaña (este componente se desmonta al salir de Inicio). */
  abierto: boolean;
  onToggle: () => void;
}

// Clientes con equipos Completados a los que todavía no se les avisó —
// típicamente porque al completar uno se eligió "Esperar a los demás"
// mientras tenían otro trabajo sin terminar. Deja mandar el aviso
// consolidado manualmente cuando tú decidas, no solo cuando se complete el
// último pendiente.
export function AvisosPendientes({ grupos, onAvisar, abierto, onToggle }: Props) {
  const lista = Object.values(grupos).filter((g) => g.trabajos.length > 0);
  if (lista.length === 0) return null;

  return (
    <div className="mb-6 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl px-5 py-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-cyan-400 font-black text-sm">
          📱 {lista.length} cliente{lista.length > 1 ? 's' : ''} con equipos listos sin avisar
        </span>
        <span className="text-cyan-400 text-xs flex-shrink-0">{abierto ? '▲' : '▼'}</span>
      </button>
      {abierto && (
        <div className="mt-2.5 space-y-1.5">
          {lista.map((g) => (
            <div
              key={g.nombre}
              className="flex items-center justify-between gap-2 bg-slate-950/40 rounded-lg px-3 py-2"
            >
              <span className="text-xs text-cyan-300/80 truncate">
                {g.nombre} · {g.trabajos.length} equipo{g.trabajos.length > 1 ? 's' : ''}
              </span>
              {tieneTelefonoValido(g.telefono) && (
                <button
                  type="button"
                  onClick={() => onAvisar(g.telefono, g.trabajos)}
                  className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-2.5 py-1.5 rounded-lg transition-all"
                >
                  📱 Avisar equipos listos ({g.trabajos.length})
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
