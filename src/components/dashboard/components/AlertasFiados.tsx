import type { Servicio } from '../../../types';
import { formatearDuracionMin } from '../../../lib/tiempo';

interface Props {
  trabajos: Servicio[];
}

// Aviso dentro de la app (nunca por correo) de equipos ya entregados que
// siguen sin pagarse hace más de 3 horas — "fiado" que conviene no perder
// de vista.
export function AlertasFiados({ trabajos }: Props) {
  if (trabajos.length === 0) return null;

  return (
    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
      <span className="text-amber-400 font-black text-sm">
        ⏰ {trabajos.length} trabajo{trabajos.length > 1 ? 's' : ''} entregado
        {trabajos.length > 1 ? 's' : ''} sigue{trabajos.length > 1 ? 'n' : ''} fiado
        {trabajos.length > 1 ? 's' : ''} (más de 3h sin pagar)
      </span>
      <div className="mt-2.5 space-y-1.5">
        {trabajos.map((s) => {
          const minutos = (Date.now() - new Date(s.entregado_at!).getTime()) / 60000;
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 bg-slate-950/40 rounded-lg px-3 py-2"
            >
              <span className="text-xs text-amber-300/80 truncate">
                {s.folio && <span className="font-mono mr-1.5">{s.folio}</span>}
                {s.clientes?.nombre || 'General'} · {s.modelo_equipo}
              </span>
              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                {formatearDuracionMin(minutos)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
