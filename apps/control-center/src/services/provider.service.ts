import type { Provider, Model, SettingsState } from '../types';
import { useAppStore } from '../stores/appStore';
import { useProviderStore } from '../stores/providerStore';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const providerService = {
  async getAll(): Promise<Provider[]> {
    const { providers } = useProviderStore.getState();
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      models: p.models.map(m => m.id),
    }));
  },

  async update(id: string, updates: Partial<Provider>): Promise<void> {
    await useProviderStore.getState().updateProvider(id, {
      name: updates.name,
    });
  },

  async connect(id: string): Promise<void> {
    await useProviderStore.getState().updateProvider(id, { isDefault: true });
  },

  async disconnect(id: string): Promise<void> {
    await useProviderStore.getState().updateProvider(id, { isDefault: false });
  },
};

export const modelService = {
  async getAll(): Promise<Model[]> {
    const { providers } = useProviderStore.getState();
    return providers.flatMap(p => p.models);
  },

  async getByProvider(providerId: string): Promise<Model[]> {
    const { providers } = useProviderStore.getState();
    const provider = providers.find(p => p.id === providerId);
    return provider?.models || [];
  },
};

export const settingsService = {
  async get(): Promise<SettingsState> {
    return useAppStore.getState().settings;
  },

  async update(updates: Partial<SettingsState>): Promise<void> {
    useAppStore.getState().updateSettings(updates);
  },
};
