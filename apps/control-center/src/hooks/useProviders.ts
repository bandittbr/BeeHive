import { useEffect, useCallback } from 'react';
import { useProviderStore } from '@/stores/providerStore';
import type { ProviderType, TestResult, Model } from '@/types';

interface ConnectedProvider {
  id: string;
  name: string;
  source?: 'env' | 'api' | 'config' | 'custom';
}

interface UseProvidersReturn {
  connectedProviders: ConnectedProvider[];
  providers: ReturnType<typeof useProviderStore.getState>['providers'];
  isLoading: boolean;
  error: string | null;
  onAddProvider: (providerId: string, apiKey: string, baseUrl?: string) => Promise<void>;
  onRemoveProvider: (providerId: string) => Promise<void>;
  testConnection: (providerId: string) => Promise<TestResult>;
  fetchModels: (providerId: string) => Promise<Model[]>;
  refreshProviders: () => Promise<void>;
}

export function useProviders(): UseProvidersReturn {
  const {
    providers,
    isLoading,
    error,
    fetchProviders,
    addProvider,
    removeProvider,
    testConnection,
    fetchModels,
  } = useProviderStore();

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAddProvider = useCallback(
    async (providerId: string, apiKey: string, baseUrl?: string) => {
      const providerType = providerId as ProviderType;
      const name = providerId.charAt(0).toUpperCase() + providerId.slice(1);
      
      await addProvider({
        providerType,
        name,
        apiKey,
        baseUrl,
      });
    },
    [addProvider]
  );

  const handleRemoveProvider = useCallback(
    async (providerId: string) => {
      await removeProvider(providerId);
    },
    [removeProvider]
  );

  const connectedProviders: ConnectedProvider[] = providers.map((p) => ({
    id: p.id,
    name: p.name,
    source: p.baseUrl ? 'custom' : 'api',
  }));

  return {
    connectedProviders,
    providers,
    isLoading,
    error,
    onAddProvider: handleAddProvider,
    onRemoveProvider: handleRemoveProvider,
    testConnection,
    fetchModels,
    refreshProviders: fetchProviders,
  };
}
