import type { ToastItem } from '../hooks/useToast';

const ESTILOS: Record<ToastItem['tipo'], string> = {
  success: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
  error: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
  info: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
  warning: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
};

const ICONOS: Record<ToastItem['tipo'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2.5 border rounded-xl px-3.5 py-3 shadow-2xl backdrop-blur-md text-sm font-medium animate-[slideIn_0.2s_ease-out] ${ESTILOS[t.tipo]}`}
        >
          <span className="text-base leading-none mt-0.5" aria-hidden>
            {ICONOS[t.tipo]}
          </span>
          <span className="flex-1 leading-snug">{t.mensaje}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="opacity-60 hover:opacity-100 text-xs px-1"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
