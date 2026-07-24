import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { encryptApiKey, decryptApiKey, maskApiKey } from '@/lib/crypto';
import type {
  ProviderType,
  ProviderStatus,
  ProviderConfig,
  Model,
  CreateProviderInput,
  UpdateProviderInput,
  TestResult,
} from '@/types';

export interface StoredProvider {
  id: string;
  providerType: ProviderType;
  name: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
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

export interface ProviderWithMaskedKey {
  id: string;
  providerType: ProviderType;
  name: string;
  maskedApiKey: string;
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

interface ProviderState {
  providers: StoredProvider[];
  currentProvider: StoredProvider | null;
  currentModel: Model | null;
  isLoading: boolean;
  error: string | null;

  fetchProviders: () => Promise<ProviderWithMaskedKey[]>;
  addProvider: (input: CreateProviderInput) => Promise<ProviderWithMaskedKey>;
  updateProvider: (id: string, input: UpdateProviderInput) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<TestResult>;
  fetchModels: (id: string) => Promise<Model[]>;
  setCurrentProvider: (provider: ProviderWithMaskedKey | null) => void;
  setCurrentModel: (model: Model | null) => void;
  getDecryptedKey: (id: string) => Promise<string>;
}

function toMasked(provider: StoredProvider): ProviderWithMaskedKey {
  return {
    id: provider.id,
    providerType: provider.providerType,
    name: provider.name,
    maskedApiKey: maskApiKey(provider.encryptedKey),
    baseUrl: provider.baseUrl,
    config: provider.config,
    isDefault: provider.isDefault,
    status: provider.status,
    lastTestedAt: provider.lastTestedAt,
    lastTestedError: provider.lastTestedError,
    models: provider.models,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  openrouter: 'https://openrouter.ai/api',
  deepseek: 'https://api.deepseek.com',
  ollama: '',
  google: 'https://generativelanguage.googleapis.com',
  nvidia: 'https://integrate.api.nvidia.com',
  mistral: 'https://api.mistral.ai',
  cohere: 'https://api.cohere.com',
  together: 'https://api.together.xyz',
  perplexity: 'https://api.perplexity.ai',
  xai: 'https://api.x.ai',
  github: 'https://models.inference.ai.azure.com',
  groq: 'https://api.groq.com/openai',
  fireworks: 'https://api.fireworks.ai',
  replicate: 'https://api.replicate.com',
  custom: '',
};

async function testProviderConnection(
  providerType: ProviderType,
  apiKey: string,
  baseUrl?: string | null
): Promise<TestResult> {
  const start = Date.now();
  try {
    let url = '';
    const headers: Record<string, string> = {};

    switch (providerType) {
      case 'openai':
        url = `${PROVIDER_ENDPOINTS.openai}/v1/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'anthropic':
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          return { success: false, error: `Anthropic ${res.status}: ${err}`, latency: Date.now() - start };
        }
        return { success: true, latency: Date.now() - start, models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307', 'claude-3-7-sonnet-20250219'] };
      case 'openrouter':
        url = 'https://openrouter.ai/api/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'deepseek':
        url = 'https://api.deepseek.com/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'ollama':
        url = `${baseUrl || 'http://localhost:11434'}/api/tags`;
        break;
      case 'google':
        url = `${PROVIDER_ENDPOINTS.google}/v1beta/models?key=${apiKey}`;
        break;
      case 'nvidia':
        url = `${PROVIDER_ENDPOINTS.nvidia}/v1/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'mistral':
        url = `${PROVIDER_ENDPOINTS.mistral}/v1/models`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'cohere':
        url = 'https://api.cohere.com/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['accept'] = 'application/json';
        break;
      case 'together':
        url = 'https://api.together.xyz/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'perplexity':
        url = 'https://api.perplexity.ai/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'xai':
        url = 'https://api.x.ai/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'github':
        url = 'https://models.inference.ai.azure.com/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'groq':
        url = 'https://api.groq.com/openai/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'fireworks':
        url = 'https://api.fireworks.ai/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'replicate':
        // Replicate uses a different API pattern
        url = 'https://api.replicate.com/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'custom':
        url = `${baseUrl}/v1/models`;
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      default:
        return { success: false, error: 'Unknown provider type', latency: Date.now() - start };
    }

    if (!url) return { success: false, error: 'No endpoint configured', latency: Date.now() - start };

    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `${response.status}: ${err}`, latency: Date.now() - start };
    }

    const data = await response.json();
    const models = (data.data || data.models || []).map((m: { id: string; name?: string }) => m.id || m.name);
    return { success: true, latency: Date.now() - start, models };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed', latency: Date.now() - start };
  }
}

function fetchModelsForProvider(models: string[], providerType: ProviderType): Model[] {
  const knownModels: Record<string, { contextWindow: number; maxOutput?: number; supportsImages?: boolean; supportsTools?: boolean }> = {
    // OpenAI
    'gpt-4o': { contextWindow: 128000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    'gpt-4o-mini': { contextWindow: 128000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    'gpt-4-turbo': { contextWindow: 128000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    'gpt-4': { contextWindow: 8192, maxOutput: 8192, supportsTools: true },
    'gpt-3.5-turbo': { contextWindow: 16384, maxOutput: 4096, supportsTools: true },
    'o1': { contextWindow: 200000, maxOutput: 100000, supportsImages: true },
    'o1-mini': { contextWindow: 128000, maxOutput: 65536 },
    'o3': { contextWindow: 200000, maxOutput: 100000, supportsImages: true },
    'o3-mini': { contextWindow: 200000, maxOutput: 100000 },
    // Anthropic
    'claude-3-5-sonnet-20241022': { contextWindow: 200000, maxOutput: 8192, supportsImages: true, supportsTools: true },
    'claude-3-opus-20240229': { contextWindow: 200000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    'claude-3-haiku-20240307': { contextWindow: 200000, maxOutput: 4096, supportsImages: true, supportsTools: true },
    'claude-3-7-sonnet-20250219': { contextWindow: 200000, maxOutput: 8192, supportsImages: true, supportsTools: true },
    'claude-sonnet-4-20250514': { contextWindow: 200000, maxOutput: 8192, supportsImages: true, supportsTools: true },
    // Google
    'gemini-1.5-pro': { contextWindow: 1048576, maxOutput: 8192, supportsImages: true, supportsTools: true },
    'gemini-1.5-flash': { contextWindow: 1048576, maxOutput: 8192, supportsImages: true, supportsTools: true },
    'gemini-2.0-flash': { contextWindow: 1048576, maxOutput: 8192, supportsImages: true, supportsTools: true },
    'gemini-2.5-pro': { contextWindow: 1048576, maxOutput: 65536, supportsImages: true, supportsTools: true },
    // DeepSeek
    'deepseek-chat': { contextWindow: 65536, maxOutput: 8192, supportsTools: true },
    'deepseek-coder': { contextWindow: 65536, maxOutput: 8192 },
    'deepseek-reasoner': { contextWindow: 65536, maxOutput: 8192 },
    // Mistral
    'mistral-large-latest': { contextWindow: 128000, maxOutput: 4096, supportsTools: true },
    'mistral-small-latest': { contextWindow: 32000, maxOutput: 4096, supportsTools: true },
    'codestral-latest': { contextWindow: 256000, maxOutput: 8192 },
    'mistral-embed': { contextWindow: 8192 },
    // Cohere
    'command-r-plus': { contextWindow: 128000, maxOutput: 4096, supportsTools: true },
    'command-r': { contextWindow: 128000, maxOutput: 4096, supportsTools: true },
    'command-a': { contextWindow: 256000, maxOutput: 4096, supportsTools: true },
    // xAI (Grok)
    'grok-2': { contextWindow: 131072, maxOutput: 8192, supportsTools: true },
    'grok-2-vision': { contextWindow: 131072, maxOutput: 8192, supportsImages: true },
    'grok-3': { contextWindow: 131072, maxOutput: 8192, supportsTools: true },
    // Perplexity
    'sonar-pro': { contextWindow: 127000, maxOutput: 4096 },
    'sonar': { contextWindow: 127000, maxOutput: 4096 },
    'sonar-deep-research': { contextWindow: 127000, maxOutput: 8192 },
    // NVIDIA
    'nvidia/llama-3.1-nemotron-70b-instruct': { contextWindow: 128000, maxOutput: 4096 },
    'nvidia/nemotron-4-340b-reward': { contextWindow: 4096 },
    // Together
    'meta-llama/Llama-3.3-70B-Instruct-Turbo': { contextWindow: 131072, maxOutput: 4096, supportsTools: true },
    'mistralai/Mixtral-8x22B-Instruct-v0.1': { contextWindow: 65536, maxOutput: 4096 },
    // Groq
    'llama-3.3-70b-versatile': { contextWindow: 131072, maxOutput: 8192, supportsTools: true },
    'llama-3.1-8b-instant': { contextWindow: 131072, maxOutput: 8192, supportsTools: true },
    'mixtral-8x7b-32768': { contextWindow: 32768, maxOutput: 4096 },
    // Fireworks
    'accounts/fireworks/models/llama-v3p3-70b-instruct': { contextWindow: 131072, maxOutput: 4096, supportsTools: true },
    'accounts/fireworks/models/deepseek-r1': { contextWindow: 65536, maxOutput: 4096 },
    // Replicate
    'meta/meta-llama-3-70b-instruct': { contextWindow: 8192, maxOutput: 4096 },
    // GitHub Models (shared models already defined above)
    'Phi-3.5-mini-instruct': { contextWindow: 128000, maxOutput: 4096 },
    'AI21-Jamba-1.5-Mini': { contextWindow: 256000, maxOutput: 4096 },
  };

  return models.map(id => {
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

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      providers: [],
      currentProvider: null,
      currentModel: null,
      isLoading: false,
      error: null,

      fetchProviders: async () => {
        const { providers } = get();
        return providers.map(toMasked);
      },

      addProvider: async (input: CreateProviderInput) => {
        set({ isLoading: true, error: null });
        try {
          const { encrypted, iv, authTag } = await encryptApiKey(input.apiKey);
          const now = new Date().toISOString();
          const id = crypto.randomUUID();

          const stored: StoredProvider = {
            id,
            providerType: input.providerType,
            name: input.name,
            encryptedKey: encrypted,
            iv,
            authTag,
            baseUrl: input.baseUrl || null,
            config: input.config || null,
            isDefault: false,
            status: 'connected',
            lastTestedAt: null,
            lastTestedError: null,
            models: [],
            createdAt: now,
            updatedAt: now,
          };

          set((state) => ({
            providers: [stored, ...state.providers],
            isLoading: false,
          }));

          const masked = toMasked(stored);

          testProviderConnection(input.providerType, input.apiKey, input.baseUrl).then((result) => {
            if (result.models && result.models.length > 0) {
              const models = fetchModelsForProvider(result.models, input.providerType);
              set((state) => ({
                providers: state.providers.map(p =>
                  p.id === id ? { ...p, status: result.success ? 'connected' : 'error', models, lastTestedAt: now, lastTestedError: result.error || null } : p
                ),
              }));
            } else {
              set((state) => ({
                providers: state.providers.map(p =>
                  p.id === id ? { ...p, status: result.success ? 'connected' : 'error', lastTestedAt: now, lastTestedError: result.error || null } : p
                ),
              }));
            }
          }).catch(() => {});

          return masked;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to add provider', isLoading: false });
          throw error;
        }
      },

      updateProvider: async (id: string, input: UpdateProviderInput) => {
        set({ isLoading: true, error: null });
        try {
          const now = new Date().toISOString();
          set((state) => {
            const providers = state.providers.map(p => {
              if (p.id !== id) return p;
              const updated = { ...p, updatedAt: now };
              if (input.name !== undefined) updated.name = input.name;
              if (input.baseUrl !== undefined) updated.baseUrl = input.baseUrl;
              if (input.config !== undefined) updated.config = input.config;
              if (input.isDefault !== undefined) {
                updated.isDefault = input.isDefault;
              }
              return updated;
            });
            return { providers, isLoading: false };
          });

          if (input.apiKey) {
            const { encrypted, iv, authTag } = await encryptApiKey(input.apiKey);
            set((state) => ({
              providers: state.providers.map(p =>
                p.id === id ? { ...p, encryptedKey: encrypted, iv, authTag } : p
              ),
            }));
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update provider', isLoading: false });
          throw error;
        }
      },

      removeProvider: async (id: string) => {
        set((state) => ({
          providers: state.providers.filter(p => p.id !== id),
          currentProvider: state.currentProvider?.id === id ? null : state.currentProvider,
        }));
      },

      testConnection: async (id: string) => {
        const { providers } = get();
        const provider = providers.find(p => p.id === id);
        if (!provider) throw new Error('Provider not found');

        const apiKey = await decryptApiKey(provider.encryptedKey, provider.iv, provider.authTag);
        const result = await testProviderConnection(provider.providerType, apiKey, provider.baseUrl);

        set((state) => ({
          providers: state.providers.map(p =>
            p.id === id
              ? { ...p, status: result.success ? 'connected' : 'error', lastTestedAt: new Date().toISOString(), lastTestedError: result.error || null }
              : p
          ),
        }));

        return result;
      },

      fetchModels: async (id: string) => {
        const { providers } = get();
        const provider = providers.find(p => p.id === id);
        if (!provider) throw new Error('Provider not found');

        const apiKey = await decryptApiKey(provider.encryptedKey, provider.iv, provider.authTag);
        const result = await testProviderConnection(provider.providerType, apiKey, provider.baseUrl);
        const models = result.models ? fetchModelsForProvider(result.models, provider.providerType) : [];

        set((state) => ({
          providers: state.providers.map(p =>
            p.id === id ? { ...p, models } : p
          ),
        }));

        return models;
      },

      setCurrentProvider: (provider) => {
        set({ currentProvider: provider ? get().providers.find(p => p.id === provider.id) || null : null, currentModel: null });
      },

      setCurrentModel: (model) => {
        set({ currentModel: model });
      },

      getDecryptedKey: async (id: string) => {
        const { providers } = get();
        const provider = providers.find(p => p.id === id);
        if (!provider) throw new Error('Provider not found');
        return decryptApiKey(provider.encryptedKey, provider.iv, provider.authTag);
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
