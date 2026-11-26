import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'carvao' | 'creme';
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'carvao', toggle: () => {} });

function initial(): Theme {
  try {
    const t = localStorage.getItem('mesai-theme');
    if (t === 'carvao' || t === 'creme') return t;
  } catch {
    /* armazenamento indisponível */
  }
  return 'carvao';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'carvao' ? '#1D1D1F' : '#4A2C18');
    try {
      localStorage.setItem('mesai-theme', theme);
    } catch {
      /* ignorado */
    }
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'carvao' ? 'creme' : 'carvao')) }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
