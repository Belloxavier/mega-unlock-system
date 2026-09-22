import { calcularEstadoGarantia } from '../../../lib/garantia';

interface Props {
  garantiaVenceAt?: string | null;
  garantiaMeses?: number;
}

// Badge de solo consulta al lado de cada equipo entregado — no depende de
// la tabla `garantias` (reclamos), solo lee garantia_vence_at. Se usa
// exclusivamente en Cobertura. Plazo 0 se muestra como Sin garantía;
// null con plazo positivo es Sin dato, diferente de una garantía vencida.
export function BadgeGarantia({ garantiaVenceAt, garantiaMeses }: Props) {
  if (garantiaMeses === 0) {
    return (
      <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/30">
        Sin garantía
      </span>
    );
  }
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
      🔴 Vencida (venció el {estado.fechaFormateada})
    </span>
  );
}
