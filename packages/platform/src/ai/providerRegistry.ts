/**
 * Definições e tipos para o gerenciamento de provedores de IA no BeeHive.
 */

export type ProviderTier = 'free' | 'paid';

export interface ProviderDefinition {
  readonly id: string;
  readonly name: string;
  readonly tier: ProviderTier;
  readonly supportsApiKey: boolean;
  readonly supportsBaseUrl: boolean;
  readonly description: string;
}

export interface ProviderCredentials {
  readonly providerId: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly enabled: boolean;
}

export const AVAILABLE_PROVIDERS: readonly ProviderDefinition[] = [
  { id: 'ollama', name: 'Ollama (Local)', tier: 'free', supportsApiKey: false, supportsBaseUrl: true, description: 'IA local executando na sua máquina.' },
  { id: 'opencode', name: 'OpenCode', tier: 'free', supportsApiKey: false, supportsBaseUrl: true, description: 'Alternativa aberta ao Claude.' },
  { id: 'openrouter', name: 'OpenRouter', tier: 'paid', supportsApiKey: true, supportsBaseUrl: false, description: 'Agregador de modelos (Claude, GPT, Llama).' },
  { id: 'openai', name: 'OpenAI', tier: 'paid', supportsApiKey: true, supportsBaseUrl: false, description: 'GPT-4o, GPT-o1.' },
  { id: 'nvidia', name: 'NVIDIA NIM', tier: 'paid', supportsApiKey: true, supportsBaseUrl: true, description: 'Modelos otimizados via NVIDIA.' },
];
