import { useCallback, useEffect, useState } from 'react';

/**
 * Roteamento interno simples, baseado no hash da URL (ex.: `#/business`).
 *
 * Escolha consciente: evita uma dependência de biblioteca de rotas para um
 * app de página única com navegação por Áreas. Dá URLs compartilháveis e
 * suporte ao botão "voltar" do navegador, sem custo de dependência.
 */
function readHash(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

export function useHashRoute(validIds: readonly string[], fallback: string) {
  const resolve = useCallback(
    (raw: string) => (validIds.includes(raw) ? raw : fallback),
    [validIds, fallback],
  );

  const [id, setId] = useState<string>(() => resolve(readHash()));

  useEffect(() => {
    const onChange = () => setId(resolve(readHash()));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, [resolve]);

  const navigate = useCallback((next: string) => {
    window.location.hash = `#/${next}`;
  }, []);

  return { id, navigate };
}
