import { useEffect, useState } from 'react';
import type { TemaUI } from '../../../types';

interface Props {
  abierto: boolean;
  T: TemaUI;
  onCancelar: () => void;
  onConfirmar: (finRealIso: string) => void;
}

function aValorLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Editor simple para cuando se olvidó tocar "Finalizar" — deja fijar a mano
// la hora real en que terminó el trabajo.
export function CorregirFinRealModal({ abierto, T, onCancelar, onConfirmar }: Props) {
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (abierto) setValor(aValorLocal(new Date()));
  }, [abierto]);

  if (!abierto) return null;

  const handleConfirmar = () => {
    if (!valor) return;
    onConfirmar(new Date(valor).toISOString());
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancelar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 mb-4">
          🕒 Corregir hora de término
        </h3>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          ¿A qué hora se terminó de verdad?
        </label>
        <input
          type="datetime-local"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white mb-5 focus:outline-none focus:border-cyan-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!valor}
            onClick={handleConfirmar}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 ${T.submit}`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
