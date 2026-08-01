import type { Servicio } from '../../../types';
import { formatearDuracionMin } from '../../../lib/tiempo';

export interface AvisoOlvidado {
  minutosTranscurridos: number;
  /** null si todavía no hay suficiente historial de esa combinación (se usó el umbral genérico). */
  minutosTipicos: number | null;
}

interface Props {
  s: Servicio;
  disabled?: boolean;
  avisoOlvidado?: AvisoOlvidado;
  onIniciar: (id: string) => void;
  onFinalizar: (id: string) => void;
  onSilenciarAviso: (id: string) => void;
  onCorregirHora: (id: string) => void;
  onToggleValidez: (id: string, actual: boolean) => void;
}

// Reloj real de trabajo, independiente del estado PENDIENTE/EN PROCESO/
// ENTREGADO — es la fuente de datos para precio sugerido, dificultad y
// carga del taller (todas aprenden de inicio_real/fin_real, no de
// created_at/completado_at).
export function TrabajoTiempoControl({
  s,
  disabled,
  avisoOlvidado,
  onIniciar,
  onFinalizar,
  onSilenciarAviso,
  onCorregirHora,
  onToggleValidez,
}: Props) {
  if (s.inicio_real && s.fin_real) {
    const minutos = (new Date(s.fin_real).getTime() - new Date(s.inicio_real).getTime()) / 60000;
    const valido = s.tiempo_valido !== false;
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold ${
            valido ? 'text-slate-400' : 'text-slate-600 line-through'
          }`}
          title={valido ? 'Tiempo real trabajado' : 'Excluido del aprendizaje de precio/dificultad'}
        >
          ⏱ {formatearDuracionMin(minutos)}
        </span>
        <button
          type="button"
          onClick={() => onToggleValidez(s.id, valido)}
          title={valido ? 'No usar este tiempo para aprender' : 'Volver a usar este tiempo para aprender'}
          className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {valido ? '🚫' : '↺'}
        </button>
      </span>
    );
  }

  if (s.inicio_real && !s.fin_real) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onFinalizar(s.id)}
          title="Finalizar trabajo (registra el tiempo real)"
          className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30 disabled:opacity-50 transition-all"
        >
          ⏹ Finalizar
        </button>
        {avisoOlvidado && (
          <div className="w-56 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-left">
            <p className="text-[10px] text-amber-200 mb-1.5 leading-snug">
              ⏱ Lleva {formatearDuracionMin(avisoOlvidado.minutosTranscurridos)}
              {avisoOlvidado.minutosTipicos != null
                ? ` (normal: ${formatearDuracionMin(avisoOlvidado.minutosTipicos)})`
                : ''}{' '}
              — ¿sigue en curso o se te olvidó finalizarlo?
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onSilenciarAviso(s.id)}
                className="flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
              >
                Sigue en curso
              </button>
              <button
                type="button"
                onClick={() => onCorregirHora(s.id)}
                className="flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all"
              >
                Corregir hora
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onIniciar(s.id)}
      title="Iniciar trabajo (empieza a contar el tiempo real)"
      className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 disabled:opacity-50 transition-all"
    >
      ▶ Iniciar
    </button>
  );
}
