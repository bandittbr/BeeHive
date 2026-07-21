import type { Provider, Model, SettingsState } from '../types';
import { useAppStore } from '../stores/appStore';
import { useProviderStore } from '../stores/providerStore';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const providerService = {
  async getAll(): Promise<Provider[]> {
    await delay(100);
    const { providers } = useProviderStore.getState();
    
    if (providers.length === 0) {
      await useProviderStore.getState().fetchProviders();
      const { providers: fetched } = useProviderStore.getState();
      return fetched.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        apiKey: p.maskedApiKey,
        models: p.models.map(m => m.id),
      }));
    }
    
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      apiKey: p.maskedApiKey,
      models: p.models.map(m => m.id),
    }));
  },

  async update(id: string, updates: Partial<Provider>): Promise<void> {
    await delay(100);
    await useProviderStore.getState().updateProvider(id, {
      name: updates.name,
      apiKey: updates.apiKey,
    });
  },

  async connect(id: string): Promise<void> {
    await delay(100);
    await useProviderStore.getState().updateProvider(id, {
      isDefault: true,
    });
  },

  async disconnect(id: string): Promise<void> {
    await delay(100);
    await useProviderStore.getState().updateProvider(id, {
      isDefault: false,
    });
  },
};

export const modelService = {
  async getAll(): Promise<Model[]> {
    await delay(100);
    const { providers } = useProviderStore.getState();
    return providers.flatMap(p => p.models);
  },

  async getByProvider(providerId: string): Promise<Model[]> {
    await delay(100);
    const { providers } = useProviderStore.getState();
    const provider = providers.find(p => p.id === providerId);
    return provider?.models || [];
  },
};

export const settingsService = {
  async get(): Promise<SettingsState> {
    await delay(100);
    return useAppStore.getState().settings;
  },

  async update(updates: Partial<SettingsState>): Promise<void> {
    await delay(200);
    useAppStore.getState().updateSettings(updates);
  },
};
