import type { Provider, Model, SettingsState } from '../types';
import { useAppStore } from '../stores/appStore';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const providerService = {
  async getAll(): Promise<Provider[]> {
    await delay(150);
    return useAppStore.getState().providers;
  },

  async update(id: string, updates: Partial<Provider>): Promise<void> {
    await delay(200);
    useAppStore.getState().updateProvider(id, updates);
  },

  async connect(id: string): Promise<void> {
    await delay(500);
    useAppStore.getState().updateProvider(id, { status: 'connected' });
  },

  async disconnect(id: string): Promise<void> {
    await delay(200);
    useAppStore.getState().updateProvider(id, { status: 'disconnected' });
  },
};

export const modelService = {
  async getAll(): Promise<Model[]> {
    await delay(100);
    return useAppStore.getState().models;
  },

  async getByProvider(providerId: string): Promise<Model[]> {
    await delay(100);
    return useAppStore.getState().models.filter(m => m.provider === providerId);
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
