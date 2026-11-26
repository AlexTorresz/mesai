import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type Kind = 'ok' | 'erro';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}
const ToastCtx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'erro' ? 6000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`card pointer-events-auto flex items-start gap-2 px-3 py-2 text-[13px] ${t.kind === 'erro' ? 'bg-[#fbe4e1]' : ''}`}
          >
            {t.kind === 'erro' ? <AlertTriangle className="mt-[2px] h-4 w-4 shrink-0 text-danger" /> : <CheckCircle2 className="mt-[2px] h-4 w-4 shrink-0 text-success" />}
            <span className="flex-1">{t.text}</span>
            <button aria-label="Fechar aviso" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
