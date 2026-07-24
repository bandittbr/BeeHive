import { create } from 'zustand';
import { BEEHIVE_API_URL } from '@/services/beehiveApi';
import { getAuthToken } from '@/services/authToken';
import type {
  ProviderType,
  ProviderStatus,
  ProviderConfig,
  Model,
  CreateProviderInput,
  UpdateProviderInput,
  TestResult,
} from '@/types';

// Provedores de IA (BYOK) persistidos no backend (Supabase, chave
// criptografada em repouso — ver apps/worker/src/index.ts /api/providers).
// Cada usuário logado (AuthGate) só vê os seus. A api key nunca volta pro
// navegador depois de salva; só o servidor guarda e usa pra chamar o provider.
export interface StoredProvider {
  id: string;
  providerType: ProviderType;
  name: string;
  baseUrl: string | null;
  config: ProviderConfig | null;
  isDefault: boolean;
  status: ProviderStatus;
  lastTestedAt: string | null;
  lastTestedError: string | null;
  models: Model[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderWithMaskedKey extends StoredProvider {
  maskedApiKey: string;
}

function fetchModelsForProvider(models: string[], providerType: ProviderType): Model[] {
  const knownModels: Record<string, { contextWindow: number; maxOutput?: number; supportsImages?: boolean; supportsTools?: boolean }> = {
    'gpt-4o': { contextWindow: 128000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    'gpt-4o-mini': { contextWindow: 128000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    'claude-3-5-sonnet-20241022': { contextWindow: 200000, maxOutput: 8192, supportsImages: true, supportsTools: true },
    'claude-3-opus-20240229': { contextWindow: 200000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    'gemini-1.5-pro': { contextWindow: 1048576, maxOutput: 8192, supportsImages: true, supportsTools: true },
    'deepseek-chat': { contextWindow: 65536, maxOutput: 8192, supportsTools: true },
  };
  return models.map((id) => {
    const known = knownModels[id];
    return {
      id,
      name: id,
      provider: providerType,
      contextWindow: known?.contextWindow || 4096,
      maxOutput: known?.maxOutput,
      supportsImages: known?.supportsImages,
      supportsTools: known?.supportsTools,
    };
  });
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BEEHIVE_API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data as T;
}

interface ProviderListResponse {
  providers: Array<{
    id: string; providerType: ProviderType; name: string; baseUrl: string | null;
    status: ProviderStatus; lastTestedAt: string | null; lastTestedError: string | null;
    models: string[]; isCurrent: boolean;
  }>;
  currentProviderId: string | null;
  currentModel: string | null;
}

interface ProviderState {
  providers: StoredProvider[];
  currentProviderId: string | null;
  currentModel: string | null;
  isLoading: boolean;
  error: string | null;

  fetchProviders: () => Promise<ProviderWithMaskedKey[]>;
  addProvider: (input: CreateProviderInput) => Promise<ProviderWithMaskedKey>;
  updateProvider: (id: string, input: UpdateProviderInput) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<TestResult>;
  fetchModels: (id: string) => Promise<Model[]>;
  selectCurrent: (id: string, model: string) => Promise<void>;
}

function toMasked(p: StoredProvider): ProviderWithMaskedKey {
  return { ...p, maskedApiKey: '••••••••' };
}

export const useProviderStore = create<ProviderState>()((set, get) => ({
  providers: [],
  currentProviderId: null,
  currentModel: null,
  isLoading: false,
  error: null,

  fetchProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api<ProviderListResponse>('/api/providers');
      const providers: StoredProvider[] = data.providers.map((p) => ({
        id: p.id,
        providerType: p.providerType,
        name: p.name,
        baseUrl: p.baseUrl,
        config: null,
        isDefault: p.isCurrent,
        status: p.status,
        lastTestedAt: p.lastTestedAt,
        lastTestedError: p.lastTestedError,
        models: fetchModelsForProvider(p.models, p.providerType),
        createdAt: '',
        updatedAt: '',
      }));
      set({ providers, currentProviderId: data.currentProviderId, currentModel: data.currentModel, isLoading: false });
      return providers.map(toMasked);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch providers', isLoading: false });
      return [];
    }
  },

  addProvider: async (input: CreateProviderInput) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api<{ provider: { id: string; providerType: ProviderType; name: string; baseUrl: string | null; status: ProviderStatus } }>('/api/providers', {
        method: 'POST',
        body: JSON.stringify({ providerType: input.providerType, name: input.name, apiKey: input.apiKey, baseUrl: input.baseUrl }),
      });
      const stored: StoredProvider = {
        id: data.provider.id, providerType: data.provider.providerType, name: data.provider.name,
        baseUrl: data.provider.baseUrl, config: input.config || null, isDefault: false,
        status: data.provider.status, lastTestedAt: null, lastTestedError: null, models: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      set((state) => ({ providers: [stored, ...state.providers], isLoading: false }));
      // busca o resultado do teste (roda em background no servidor) depois de um instante
      setTimeout(() => { get().fetchProviders().catch(() => {}); }, 1500);
      return toMasked(stored);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add provider', isLoading: false });
      throw error;
    }
  },

  updateProvider: async (_id: string, _input: UpdateProviderInput) => {
    // Renomear/trocar base URL ainda não tem endpoint dedicado no backend;
    // isDefault é tratado por selectCurrent(). Mantido pra compat de tipos.
  },

  removeProvider: async (id: string) => {
    try {
      await api(`/api/providers/${id}`, { method: 'DELETE' });
      set((state) => ({
        providers: state.providers.filter((p) => p.id !== id),
        currentProviderId: state.currentProviderId === id ? null : state.currentProviderId,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove provider' });
      throw error;
    }
  },

  testConnection: async (id: string) => {
    const result = await api<TestResult>(`/api/providers/${id}/test`, { method: 'POST' });
    set((state) => ({
      providers: state.providers.map((p) => p.id === id
        ? { ...p, status: result.success ? 'connected' : 'error', lastTestedAt: new Date().toISOString(), lastTestedError: result.error || null, models: result.models ? fetchModelsForProvider(result.models, p.providerType) : p.models }
        : p),
    }));
    return result;
  },

  fetchModels: async (id: string) => {
    const result = await get().testConnection(id);
    return get().providers.find((p) => p.id === id)?.models
      ?? (result.models ? fetchModelsForProvider(result.models, get().providers.find((p) => p.id === id)?.providerType ?? 'custom') : []);
  },

  // Marca este provider+modelo como "o atual" — é o que /api/conversation/respond
  // usa automaticamente na próxima vez (mesmo depois de fechar e abrir de novo,
  // porque fica salvo no usuário no banco, não no navegador).
  selectCurrent: async (id: string, model: string) => {
    await api(`/api/providers/${id}/select`, { method: 'POST', body: JSON.stringify({ model }) });
    set({ currentProviderId: id, currentModel: model });
  },
}));
