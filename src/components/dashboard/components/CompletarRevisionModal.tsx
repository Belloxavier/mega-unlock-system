import { useEffect, useState } from 'react';
import type { TemaUI } from '../../../types';

interface Props {
  abierto: boolean;
  T: TemaUI;
  diagnosticoInicial: string;
  montoInicial: string;
  onCancelar: () => void;
  onConfirmar: (diagnostico: string, monto: number) => void;
}

// Reemplaza los dos window.prompt encadenados (diagnóstico + precio) que se
// pedían al completar una revisión — un solo envío en vez de dos diálogos
// nativos seguidos.
export function CompletarRevisionModal({
  abierto,
  T,
  diagnosticoInicial,
  montoInicial,
  onCancelar,
  onConfirmar,
}: Props) {
  const [diagnostico, setDiagnostico] = useState(diagnosticoInicial);
  const [monto, setMonto] = useState(montoInicial);

  useEffect(() => {
    if (abierto) {
      setDiagnostico(diagnosticoInicial);
      setMonto(montoInicial);
    }
  }, [abierto, diagnosticoInicial, montoInicial]);

  if (!abierto) return null;

  const montoNum = parseFloat(monto);
  const montoValido = monto.trim() !== '' && !isNaN(montoNum) && montoNum >= 0;
  const puedeConfirmar = diagnostico.trim() !== '' && montoValido;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancelar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 mb-4">
          🔍 Completar revisión
        </h3>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              ¿Qué se encontró o se hizo?
            </label>
            <textarea
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Ej. Pantalla dañada, se reemplazó módulo táctil"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Precio final a cobrar
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
            onClick={() => onConfirmar(diagnostico.trim(), montoNum)}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 ${T.submit}`}
          >
            Completar
          </button>
        </div>
      </div>
    </div>
  );
}
