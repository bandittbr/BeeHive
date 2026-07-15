import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getActiveProvider, setDefaultModel, activateProvider } from '@/services/settings/settingsService';

interface ModelContextValue {
  activeModel: string;
  activeProviderId: string | null;
  loading: boolean;
  error: string | null;
  setModel: (model: string) => Promise<void>;
  setProvider: (providerId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [activeModel, setActiveModelState] = useState<string>('');
  const [activeProviderId, setActiveProviderIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await getActiveProvider();
      setActiveModelState(info.activeModel ?? '');
      setActiveProviderIdState(info.activeProviderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar modelo ativo');
    } finally {
      setLoading(false);
    }
  }, []);

  const setModel = useCallback(async (model: string) => {
    setError(null);
    try {
      await setDefaultModel(model);
      setActiveModelState(model);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao trocar modelo');
      throw err;
    }
  }, []);

  const setProvider = useCallback(async (providerId: string) => {
    setError(null);
    try {
      await activateProvider(providerId);
      // o provider traz seu defaultModel, recarregar
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao trocar provider');
      throw err;
    }
  }, [load]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ModelContext.Provider value={{
      activeModel,
      activeProviderId,
      loading,
      error,
      setModel,
      setProvider,
      refresh: load,
    }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error('useModel deve ser usado dentro de ModelProvider');
  return ctx;
}