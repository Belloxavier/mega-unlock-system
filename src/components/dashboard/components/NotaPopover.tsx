import { useState } from 'react';

interface Props {
  nota: string;
  alinear?: 'left' | 'right';
}

// Ícono chico que abre un globo con el texto completo de la nota — así una
// nota larga no desordena la fila de la tabla ni de la tarjeta móvil.
export function NotaPopover({ nota, alinear = 'left' }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <span className="relative inline-block align-middle ml-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
        title="Ver nota"
        aria-label="Ver nota"
        className="inline-flex items-center justify-center p-5 -m-5 text-amber-300/80 hover:text-amber-300 text-sm leading-none"
      >
        📝
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} aria-hidden />
          <div
            className={`absolute z-40 mt-1.5 ${alinear === 'right' ? 'right-0' : 'left-0'} bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-3 w-56 text-[11px] normal-case font-normal tracking-normal text-slate-200 whitespace-pre-line`}
          >
            {nota}
          </div>
        </>
      )}
    </span>
  );
}
