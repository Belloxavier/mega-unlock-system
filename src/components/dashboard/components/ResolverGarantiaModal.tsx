import { useEffect, useState } from 'react';
import type { TemaUI } from '../../../types';

interface Props {
  abierto: boolean;
  T: TemaUI;
  onCancelar: () => void;
  onConfirmar: (nota: string, montoDevuelto: number | null) => void;
}

// Reemplaza la secuencia de window.prompt/window.confirm/window.prompt
// (nota → ¿hubo devolución? → monto) por una sola pantalla.
export function ResolverGarantiaModal({ abierto, T, onCancelar, onConfirmar }: Props) {
  const [nota, setNota] = useState('');
  const [huboDevolucion, setHuboDevolucion] = useState(false);
  const [monto, setMonto] = useState('');

  useEffect(() => {
    if (abierto) {
      setNota('');
      setHuboDevolucion(false);
      setMonto('');
    }
  }, [abierto]);

  if (!abierto) return null;

  const montoNum = parseFloat(monto);
  const montoValido = !huboDevolucion || (monto.trim() !== '' && !isNaN(montoNum) && montoNum > 0);
  const puedeConfirmar = nota.trim() !== '' && montoValido;

  const handleConfirmar = () => {
    onConfirmar(nota.trim(), huboDevolucion && monto.trim() !== '' ? montoNum : null);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancelar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 mb-4">
          🛡️ Resolver garantía
        </h3>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              ¿Qué se hizo para resolverla?
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Ej. reparado sin costo, se cambió pieza, se devolvió dinero"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={huboDevolucion}
              onChange={(e) => setHuboDevolucion(e.target.checked)}
              className="w-4 h-4 accent-rose-400"
            />
            <span className="text-xs font-bold text-slate-300">¿Hubo que devolver dinero al cliente?</span>
          </label>
          {huboDevolucion && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                ¿Cuánto se devolvió?
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}
        </div>
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
            disabled={!puedeConfirmar}
            onClick={handleConfirmar}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 ${T.submit}`}
          >
            Resolver
          </button>
        </div>
      </div>
    </div>
  );
}
