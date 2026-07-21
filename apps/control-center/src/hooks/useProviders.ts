import { useEffect, useCallback } from 'react';
import { useProviderStore } from '@/stores/providerStore';
import type { ProviderType, TestResult, Model, CreateProviderInput } from '@/types';

interface ConnectedProvider {
  id: string;
  name: string;
  source?: 'env' | 'api' | 'config' | 'custom';
}

interface UseProvidersReturn {
  connectedProviders: ConnectedProvider[];
  providers: Array<{
    id: string;
    providerType: ProviderType;
    name: string;
    maskedApiKey: string;
    baseUrl: string | null;
    status: 'connected' | 'disconnected' | 'error' | 'testing';
    lastTestedAt: string | null;
    lastTestedError: string | null;
    models: Model[];
  }>;
  isLoading: boolean;
  error: string | null;
  onAddProvider: (providerId: string, apiKey: string, baseUrl?: string) => Promise<void>;
  onRemoveProvider: (providerId: string) => Promise<void>;
  testConnection: (providerId: string) => Promise<TestResult>;
  fetchModels: (providerId: string) => Promise<Model[]>;
  refreshProviders: () => Promise<void>;
}

export function useProviders(): UseProvidersReturn {
  const store = useProviderStore();

  const providers = store.providers.map(p => ({
    id: p.id,
    providerType: p.providerType,
    name: p.name,
    maskedApiKey: p.encryptedKey.slice(0, 4) + '...' + p.encryptedKey.slice(-4),
    baseUrl: p.baseUrl,
    status: p.status,
    lastTestedAt: p.lastTestedAt,
    lastTestedError: p.lastTestedError,
    models: p.models,
  }));

  const handleAddProvider = useCallback(
    async (providerId: string, apiKey: string, baseUrl?: string) => {
      const providerType = providerId as ProviderType;
      const name = providerId.charAt(0).toUpperCase() + providerId.slice(1);
      
      await store.addProvider({
        providerType,
        name,
        apiKey,
        baseUrl,
      });
    },
    [store.addProvider]
  );

  const handleRemoveProvider = useCallback(
    async (providerId: string) => {
      await store.removeProvider(providerId);
    },
    [store.removeProvider]
  );

  const connectedProviders: ConnectedProvider[] = providers.map((p) => ({
    id: p.id,
    name: p.name,
    source: p.baseUrl ? 'custom' : 'api',
  }));

  return {
    connectedProviders,
    providers,
    isLoading: store.isLoading,
    error: store.error,
    onAddProvider: handleAddProvider,
    onRemoveProvider: handleRemoveProvider,
    testConnection: store.testConnection,
    fetchModels: store.fetchModels,
    refreshProviders: async () => { await store.fetchProviders(); },
  };
}
