import { calcularEstadoGarantia } from '../../../lib/garantia';

interface Props {
  garantiaVenceAt?: string | null;
}

// Badge de solo consulta al lado de cada equipo entregado — no depende de
// la tabla `garantias` (reclamos), solo lee garantia_vence_at. Se usa
// exclusivamente donde ya se filtró a equipos ENTREGADO (Garantías →
// Cobertura), así que garantia_vence_at en null ahí significa "nunca se
// registró la fecha real de entrega" (datos históricos de antes del
// sistema de folios), NO "no vigente" — se muestra distinto a propósito
// para no confundir "sin dato" con "vencida".
export function BadgeGarantia({ garantiaVenceAt }: Props) {
  const estado = calcularEstadoGarantia(garantiaVenceAt);

  if (!estado) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border bg-slate-700/20 text-slate-400 border-slate-600/40">
        ⚪ Sin dato
      </span>
    );
  }

  if (estado.vigente) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
        🟢 Vence en {estado.diasRestantes} día{estado.diasRestantes === 1 ? '' : 's'} ({estado.fechaFormateada})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/30">
      🔴 Sin garantía (venció el {estado.fechaFormateada})
    </span>
  );
}
