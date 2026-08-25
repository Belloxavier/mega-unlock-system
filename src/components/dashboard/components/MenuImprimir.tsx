import type { ReactNode } from 'react';

interface Props {
  abierto: boolean;
  alinear?: 'left' | 'right';
  wrapperClassName?: string;
  triggerClassName: string;
  onAbrir: () => void;
  onCerrar: () => void;
  onImprimirCliente: () => void;
  onImprimirEtiqueta: () => void;
  children: ReactNode;
}

// Un solo botón de imprimir que deja elegir qué papeleta sacar — se
// mandan por separado (no una detrás de otra en el mismo trabajo de
// impresión) porque la impresora térmica solo corta automático al final
// de cada trabajo.
export function MenuImprimir({
  abierto,
  alinear = 'left',
  wrapperClassName,
  triggerClassName,
  onAbrir,
  onCerrar,
  onImprimirCliente,
  onImprimirEtiqueta,
  children,
}: Props) {
  return (
    <div className={`relative inline-block ${wrapperClassName || ''}`}>
      <button
        type="button"
        onClick={() => (abierto ? onCerrar() : onAbrir())}
        title="Imprimir"
        aria-label="Imprimir"
        className={triggerClassName}
      >
        {children}
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={onCerrar} aria-hidden />
          <div
            className={`absolute z-40 mt-1.5 ${alinear === 'right' ? 'right-0' : 'left-0'} bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-2 w-48`}
          >
            <button
              type="button"
              onClick={() => {
                onCerrar();
                onImprimirCliente();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 active:bg-slate-800 transition-colors"
            >
              🧾 Etiqueta cliente
            </button>
            <button
              type="button"
              onClick={() => {
                onCerrar();
                onImprimirEtiqueta();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 active:bg-slate-800 transition-colors"
            >
              🏷️ Etiqueta local
            </button>
          </div>
        </>
      )}
    </div>
  );
}
