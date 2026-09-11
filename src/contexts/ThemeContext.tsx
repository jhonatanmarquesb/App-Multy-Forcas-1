import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type ThemePref = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  /** O que o usuário escolheu: seguir o sistema, ou forçar um tema. */
  themePref: ThemePref;
  /** O tema que está realmente aplicado agora (depois de resolver "system"). */
  resolvedTheme: ResolvedTheme;
  setThemePref: (pref: ThemePref) => void;
  /** Alterna entre Sistema → Claro → Escuro → Sistema, pro botão de atalho. */
  cycleThemePref: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'mf-theme-pref';

const getSystemTheme = (): ResolvedTheme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePref, setThemePrefState] = useState<ThemePref>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch { /* localStorage pode estar bloqueado (modo privado) — cai no padrão */ }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Escuta mudanças em tempo real: se a pessoa mudar o tema do celular com
  // o app aberto, a interface acompanha na hora, sem precisar recarregar.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => setSystemTheme(mq.matches ? 'light' : 'dark');
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const resolvedTheme: ResolvedTheme = themePref === 'system' ? systemTheme : themePref;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    // Meta theme-color: a barra de status do celular acompanha o tema também.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolvedTheme === 'light' ? '#f7f7f8' : '#121215');
  }, [resolvedTheme]);

  const setThemePref = useCallback((pref: ThemePref) => {
    setThemePrefState(pref);
    try { localStorage.setItem(STORAGE_KEY, pref); } catch { /* ignora se bloqueado */ }
  }, []);

  const cycleThemePref = useCallback(() => {
    setThemePref(themePref === 'system' ? 'light' : themePref === 'light' ? 'dark' : 'system');
  }, [themePref, setThemePref]);

  return (
    <ThemeContext.Provider value={{ themePref, resolvedTheme, setThemePref, cycleThemePref }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
