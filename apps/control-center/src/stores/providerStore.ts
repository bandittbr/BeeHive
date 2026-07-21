import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProviderWithModels,
  Model,
  CreateProviderInput,
  UpdateProviderInput,
  TestResult,
} from '@/types';

interface ProviderState {
  providers: ProviderWithModels[];
  currentProvider: ProviderWithModels | null;
  currentModel: Model | null;
  isLoading: boolean;
  error: string | null;
  
  fetchProviders: () => Promise<void>;
  addProvider: (input: CreateProviderInput) => Promise<ProviderWithModels>;
  updateProvider: (id: string, input: UpdateProviderInput) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<TestResult>;
  fetchModels: (id: string) => Promise<Model[]>;
  setCurrentProvider: (provider: ProviderWithModels | null) => void;
  setCurrentModel: (model: Model | null) => void;
}

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      providers: [],
      currentProvider: null,
      currentModel: null,
      isLoading: false,
      error: null,

      fetchProviders: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/providers');
          if (!response.ok) throw new Error('Failed to fetch providers');
          const data = await response.json();
          const providers = data.providers || [];
          
          set((state) => {
            const currentProvider = state.currentProvider
              ? providers.find((p: ProviderWithModels) => p.id === state.currentProvider?.id) || null
              : null;
            
            return {
              providers,
              currentProvider,
              isLoading: false,
            };
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch providers',
            isLoading: false,
          });
        }
      },

      addProvider: async (input: CreateProviderInput) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/providers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add provider');
          }
          
          const data = await response.json();
          const newProvider: ProviderWithModels = { ...data.provider, models: [] };
          
          set((state) => ({
            providers: [newProvider, ...state.providers],
            isLoading: false,
          }));
          
          return newProvider;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to add provider',
            isLoading: false,
          });
          throw error;
        }
      },

      updateProvider: async (id: string, input: UpdateProviderInput) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/providers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update provider');
          }
          
          const data = await response.json();
          
          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === id ? { ...p, ...data.provider } : p
            ),
            currentProvider:
              state.currentProvider?.id === id
                ? { ...state.currentProvider, ...data.provider }
                : state.currentProvider,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update provider',
            isLoading: false,
          });
          throw error;
        }
      },

      removeProvider: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/providers/${id}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove provider');
          }
          
          set((state) => ({
            providers: state.providers.filter((p) => p.id !== id),
            currentProvider:
              state.currentProvider?.id === id ? null : state.currentProvider,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to remove provider',
            isLoading: false,
          });
          throw error;
        }
      },

      testConnection: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/providers/${id}/test`, {
            method: 'POST',
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to test connection');
          }
          
          const result: TestResult = await response.json();
          
          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status: result.success ? 'connected' : 'error',
                    lastTestedAt: new Date().toISOString(),
                    lastTestedError: result.error || null,
                  }
                : p
            ),
            currentProvider:
              state.currentProvider?.id === id
                ? {
                    ...state.currentProvider,
                    status: result.success ? 'connected' : 'error',
                    lastTestedAt: new Date().toISOString(),
                    lastTestedError: result.error || null,
                  }
                : state.currentProvider,
            isLoading: false,
          }));
          
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to test connection',
            isLoading: false,
          });
          throw error;
        }
      },

      fetchModels: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`/api/providers/${id}/models`, {
            method: 'POST',
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch models');
          }
          
          const data = await response.json();
          const models: Model[] = data.models || [];
          
          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === id ? { ...p, models } : p
            ),
            currentProvider:
              state.currentProvider?.id === id
                ? { ...state.currentProvider, models }
                : state.currentProvider,
            isLoading: false,
          }));
          
          return models;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch models',
            isLoading: false,
          });
          throw error;
        }
      },

      setCurrentProvider: (provider: ProviderWithModels | null) => {
        set({ currentProvider: provider, currentModel: null });
      },

      setCurrentModel: (model: Model | null) => {
        set({ currentModel: model });
      },
    }),
    {
      name: 'beehive-providers',
      partialize: (state) => ({
        providers: state.providers,
        currentProvider: state.currentProvider,
        currentModel: state.currentModel,
      }),
    }
  )
);
