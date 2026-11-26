import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Mensagem mostrada na tela de login após a sessão ser encerrada (outro login, inatividade). */
  notice: string | null;
  clearNotice: () => void;
  login: (login: string, password: string) => Promise<User>;
  logout: (notice?: string) => Promise<void>;
  setUser: (u: User) => void;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>(null as unknown as AuthState);
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [inactivityMinutes, setInactivityMinutes] = useState(30);
  const lastActivity = useRef(Date.now());

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User; inactivityMinutes: number }>('/auth/me');
      setUser(r.user);
      setInactivityMinutes(r.inactivityMinutes);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // RF-06 / RF-07 — o servidor encerrou a sessão (novo login em outro lugar ou inatividade)
  useEffect(() => {
    const onEnded = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setUser(null);
      setNotice(detail?.message ?? 'Sua sessão foi encerrada.');
    };
    window.addEventListener('mesai:session-ended', onEnded);
    return () => window.removeEventListener('mesai:session-ended', onEnded);
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const r = await api<{ user: User; inactivityMinutes: number }>('/auth/login', { method: 'POST', body: { login: loginValue, password } });
    lastActivity.current = Date.now();
    setUser(r.user);
    setInactivityMinutes(r.inactivityMinutes);
    setNotice(null);
    return r.user;
  }, []);

  const logout = useCallback(async (msg?: string) => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* sessão já encerrada no servidor */
    }
    setUser(null);
    setNotice(msg ?? null);
  }, []);

  // RF-07 — logout automático por inatividade também no navegador
  useEffect(() => {
    if (!user) return;
    const mark = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
    const id = window.setInterval(() => {
      if (Date.now() - lastActivity.current > inactivityMinutes * 60_000) {
        void logout(`Sua sessão expirou após ${inactivityMinutes} minutos de inatividade. Entre novamente.`);
      }
    }, 20_000);
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, mark));
      window.clearInterval(id);
    };
  }, [user, inactivityMinutes, logout]);

  return (
    <AuthCtx.Provider value={{ user, loading, notice, clearNotice: () => setNotice(null), login, logout, setUser, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
