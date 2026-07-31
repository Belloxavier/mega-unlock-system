import type { Servicio } from '../../../types';
import { ESTADOS_PROGRESO, getDotColor, getBadgeColor } from '../../../lib/estado';

interface Props {
  s: Servicio;
  alinear?: 'left' | 'right';
  abierto: boolean;
  onToggle: () => void;
  onCerrar: () => void;
  onCambiar: (nuevoEstado: string) => void;
  disabled?: boolean;
}

/**
 * Menú de estado custom (evita el picker nativo de iOS).
 * Controlado desde el padre para un solo menú abierto a la vez.
 */
export function EstadoControl({
  s,
  alinear = 'left',
  abierto,
  onToggle,
  onCerrar,
  onCambiar,
  disabled,
}: Props) {
  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase shadow-sm ${getBadgeColor(s.estado, s.created_at)}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(s.estado)}`} />
      {s.estado}
    </span>
  );

  if (s.estado === 'NO REALIZADO') return badge;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm disabled:opacity-50 ${getBadgeColor(s.estado, s.created_at)}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(s.estado)}`} />
        {s.estado}
        <span className="text-[8px] opacity-70">▾</span>
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={onCerrar} aria-hidden />
          <div
            role="listbox"
            className={`absolute z-40 mt-1.5 ${alinear === 'right' ? 'right-0' : 'left-0'} bg-slate-950 border border-slate-700 rounded-xl overflow-hidden shadow-2xl min-w-[150px]`}
          >
            {ESTADOS_PROGRESO.filter((op) => op !== s.estado).map((op) => (
              <button
                type="button"
                key={op}
                role="option"
                onClick={() => {
                  onCambiar(op);
                  onCerrar();
                }}
                className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-slate-800/80 active:bg-slate-800 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full ${getDotColor(op)}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">{op}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
