import { useCallback, useEffect, useState } from 'react';

/**
 * Controle de tema (escuro/claro) — puramente visual.
 * Aplica o atributo `data-theme` no elemento <html>, de onde os tokens CSS
 * derivam todas as cores. O tema escuro é o padrão do BeeHive. A escolha é
 * persistida em localStorage para sobreviver a recarregamentos.
 */
export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'beehive:theme';

function readInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* armazenamento indisponível — ignora */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
