import type { Servicio } from '../../../types';

interface Props {
  trabajos: Servicio[];
  onRecordar: (s: Servicio) => void;
}

export function AlertasAtascados({ trabajos, onRecordar }: Props) {
  if (trabajos.length === 0) return null;

  return (
    <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-5 py-4">
      <span className="text-rose-400 font-black text-sm">
        ⚠️ {trabajos.length} trabajo{trabajos.length > 1 ? 's' : ''} lleva
        {trabajos.length > 1 ? 'n' : ''} más de 24h sin entregarse
      </span>
      <div className="mt-2.5 space-y-1.5">
        {trabajos.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-2 bg-slate-950/40 rounded-lg px-3 py-2"
          >
            <span className="text-xs text-rose-300/80 truncate">
              {s.folio && <span className="font-mono mr-1.5">{s.folio}</span>}
              {s.clientes?.nombre || 'General'} · {s.modelo_equipo}
            </span>
            {s.clientes?.telefono && (
              <button
                type="button"
                onClick={() => onRecordar(s)}
                className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2.5 py-1.5 rounded-lg transition-all"
              >
                📱 Recordar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
