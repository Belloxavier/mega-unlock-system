/**
 * Confirmación estilo bottom-sheet (móvil) / modal centrado (desktop).
 * Sustituye window.confirm en acciones destructivas o sensibles.
 */

interface Props {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  confirmLabel?: string;
  cancelLabel?: string;
  peligro?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  abierto,
  titulo,
  mensaje,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  peligro,
  onConfirm,
  onCancel,
}: Props) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <h3 id="confirm-title" className="text-sm font-black uppercase tracking-wider text-slate-100 mb-2">
          {titulo}
        </h3>
        <p className="text-sm text-slate-300 mb-5 whitespace-pre-line">{mensaje}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider ${
              peligro
                ? 'bg-rose-500 text-white'
                : 'bg-cyan-500 text-slate-950'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
