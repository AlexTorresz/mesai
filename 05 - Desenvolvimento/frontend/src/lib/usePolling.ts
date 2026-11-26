import { useEffect, useRef } from 'react';

/** Executa `fn` a cada `ms` enquanto a aba estiver visível (RNF-07: atualização em até 10 s). */
export function usePolling(fn: () => void | Promise<void>, ms: number, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void saved.current();
    }, ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void saved.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms, enabled]);
}
