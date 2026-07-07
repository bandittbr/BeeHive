import { useCallback, useEffect, useState } from 'react';

/**
 * Controle de tema (escuro/claro) — puramente visual.
 * Aplica o atributo `data-theme` no elemento <html>, de onde os tokens CSS
 * derivam todas as cores. O tema escuro é o padrão do BeeHive.
 *
 * Sem persistência (nenhum armazenamento) no Sprint 1, coerente com o escopo.
 */
export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
