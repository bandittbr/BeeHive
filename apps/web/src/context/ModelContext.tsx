import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getActiveProvider, setDefaultModel, activateProvider, listProviders, getProviderModels, type ProviderCatalogStatus } from '@/services/settings/settingsService';

interface ProviderModel {
  id: string;
  name: string;
  vision: boolean;
}

interface ProviderWithModels extends ProviderCatalogStatus {
  models: ProviderModel[];
  loadingModels: boolean;
  error?: string;
}

interface ModelContextValue {
  activeModel: string;
  activeProviderId: string | null;
  loading: boolean;
  error: string | null;
  providers: ProviderWithModels[];
  loadingProviders: boolean;
  setModel: (model: string) => Promise<void>;
  setProvider: (providerId: string) => Promise<void>;
  refresh: () => Promise<void>;
  loadProviderModels: (providerId: string) => Promise<void>;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [activeModel, setActiveModelState] = useState<string>('');
  const [activeProviderId, setActiveProviderIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderWithModels[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

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

  const loadProviders = useCallback(async () => {
    setLoadingProviders(true);
    try {
      const data = await listProviders();
      const withModels = data.map(p => ({ ...p, models: [], loadingModels: false, error: undefined }));
      setProviders(withModels);
    } catch (err) {
      console.error('Erro ao carregar providers:', err);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  const loadProviderModels = useCallback(async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider || provider.loadingModels) return;

    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, loadingModels: true, error: undefined } : p));

    try {
      const models = await getProviderModels(providerId);
      const mappedModels = models.map(m => ({ id: m, name: m, vision: m.includes('vision') || m.includes('llava') || m.includes('gpt-4o') || m.includes('claude-3') }));
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, models: mappedModels, loadingModels: false } : p));
    } catch (err) {
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, loadingModels: false, error: err instanceof Error ? err.message : 'Erro ao carregar modelos' } : p));
    }
  }, [providers]);

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
      await load();
      // Carregar modelos do novo provider
      await loadProviderModels(providerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao trocar provider');
      throw err;
    }
  }, [load, loadProviderModels]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadProviders(); }, [loadProviders]);

  return (
    <ModelContext.Provider value={{
      activeModel,
      activeProviderId,
      loading,
      error,
      providers,
      loadingProviders,
      setModel,
      setProvider,
      refresh: load,
      loadProviderModels,
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