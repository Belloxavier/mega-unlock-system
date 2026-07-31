import { useCallback, useState } from 'react';

export type ToastTipo = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  mensaje: string;
  tipo: ToastTipo;
}

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((mensaje: string, tipo: ToastTipo = 'info') => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, mensaje, tipo }]);
    const ms = tipo === 'error' ? 5000 : 3200;
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ms);
    return id;
  }, []);

  return { toasts, toast, dismiss };
}
