/**
 * Catálogo declarativo de providers de IA suportados pelo BeeHive.
 *
 * Cada entrada descreve um provider que o sistema pode instanciar.
 * O ProviderManager usa este catálogo para:
 *  1. Listar providers disponíveis na UI (cards)
 *  2. Saber quais campos o provider precisa (apiKey, baseUrl)
 *  3. Instanciar o implementador correto (OllamaProvider, OpenAIProvider, etc.)
 *  4. Fornecer o modelo padrão de cada provider
 *
 * Este catálogo é ESTÁTICO — credenciais e estado (habilitado/desabilitado)
 * ficam em别的 lugares (credentialsStore e ProviderManager, respectivamente).
 */
import type { AICapability } from '../types';

/** Tipo de credential que o provider precisa. */
export type CredentialField = 'apiKey' | 'baseUrl';

/** Implementador concreto que o ProviderManager deve instanciar. */
export type ProviderImplementation = 'ollama' | 'openai' | 'anthropic' | 'gemini';

/** Uma entrada no catálogo de providers. */
export interface ProviderCatalogEntry {
  /** ID único (usado como chave interna e na UI). */
  readonly id: string;
  /** Nome amigável para exibição. */
  readonly name: string;
  /** Ícone na UI (nome do ícone do sistema de ícones do BeeHive). */
  readonly icon: string;
  /** Tier: local (roda na máquina), free (cloud gratuito), paid (cloud pago). */
  readonly tier: 'local' | 'free' | 'paid';
  /** Descrição curta para o card na UI. */
  readonly description: string;
  /** URL base padrão do provider (ex.: http://localhost:11434 para Ollama). */
  readonly defaultBaseUrl: string;
  /** O usuário pode alterar a baseUrl? (false para providers como OpenAI). */
  readonly baseUrlEditable: boolean;
  /** O provider precisa de API key? (false para Ollama local). */
  readonly requiresApiKey: boolean;
  /** Modelo padrão quando nada é configurado. */
  readonly defaultModel: string;
  /** Capacidades suportadas por este provider. */
  readonly capabilities: readonly AICapability[];
  /** Qual implementação de AIProvider usar. */
  readonly implementation: ProviderImplementation;
  /** Placeholder para o input de API key na UI. */
  readonly apiKeyPlaceholder?: string;
  /** Placeholder para o input de baseUrl na UI. */
  readonly baseUrlPlaceholder?: string;
}

/**
 * BigPickle — modelo padrão do BeeHive quando nenhuma configuração existe.
 * Disponível via OpenRouter (agregador) ou OpenAI-compatible.
 */
export const BIGPICKLE_DEFAULT_MODEL = 'big-pickle';

/**
 * Catálogo oficial de providers suportados.
 * Ordenado por tier (local → free → paid) para UX na UI.
 */
export const PROVIDER_CATALOG: readonly ProviderCatalogEntry[] = [
  // ── Local ──────────────────────────────────────────────────────────────
  {
    id: 'ollama',
    name: 'Ollama',
    icon: 'ollama',
    tier: 'local',
    description: 'IA local executando na sua máquina. Sem custo, sem internet.',
    defaultBaseUrl: 'http://localhost:11434',
    baseUrlEditable: true,
    requiresApiKey: false,
    defaultModel: 'llama3.2',
    capabilities: ['chat', 'streaming', 'tools'],
    implementation: 'ollama',
    baseUrlPlaceholder: 'http://localhost:11434',
  },

  // ── Free ───────────────────────────────────────────────────────────────
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: 'opencode',
    tier: 'free',
    description: 'Alternativa aberta. BigPickle como modelo padrão.',
    defaultBaseUrl: 'https://api.opencode.ai/v1',
    baseUrlEditable: true,
    requiresApiKey: false,
    defaultModel: BIGPICKLE_DEFAULT_MODEL,
    capabilities: ['chat', 'streaming', 'tools'],
    implementation: 'openai',
    baseUrlPlaceholder: 'https://api.opencode.ai/v1',
  },

  // ── Paid (agregadores e diretos) ───────────────────────────────────────
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: 'openrouter',
    tier: 'paid',
    description: 'Agregador: 200+ modelos (Claude, GPT, Llama, Gemma...) com uma key.',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    baseUrlEditable: false,
    requiresApiKey: true,
    defaultModel: 'openai/gpt-4o-mini',
    capabilities: ['chat', 'streaming', 'tools'],
    implementation: 'openai',
    apiKeyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'openai',
    tier: 'paid',
    description: 'GPT-4o, GPT-o1, o3-mini. A API oficial da OpenAI.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    baseUrlEditable: false,
    requiresApiKey: true,
    defaultModel: 'gpt-4o-mini',
    capabilities: ['chat', 'streaming', 'tools'],
    implementation: 'openai',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: 'anthropic',
    tier: 'paid',
    description: 'Claude Sonnet, Opus, Haiku. API oficial da Anthropic.',
    defaultBaseUrl: 'https://api.anthropic.com',
    baseUrlEditable: false,
    requiresApiKey: true,
    defaultModel: 'claude-sonnet-4-20250514',
    capabilities: ['chat', 'streaming', 'tools'],
    implementation: 'anthropic',
    apiKeyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: 'groq',
    tier: 'paid',
    description: 'Inferência ultra-rápida via LPU. Modelos Llama, Mixtral, Gemma.',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    baseUrlEditable: false,
    requiresApiKey: true,
    defaultModel: 'llama-3.3-70b-versatile',
    capabilities: ['chat', 'streaming', 'tools'],
    implementation: 'openai',
    apiKeyPlaceholder: 'gsk_...',
  },
  {
    id: 'together',
    name: 'Together AI',
    icon: 'together',
    tier: 'paid',
    description: 'Inferência cloud para modelos open-source (Llama, Mistral, Qwen).',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    baseUrlEditable: false,
    requiresApiKey: true,
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    capabilities: ['chat', 'streaming', 'tools'],
    implementation: 'openai',
    apiKeyPlaceholder: '...',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    icon: 'nvidia',
    tier: 'paid',
    description: 'Modelos otimizados via NVIDIA. API OpenAI-compatível.',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    baseUrlEditable: true,
    requiresApiKey: true,
    defaultModel: 'meta/llama-3.1-8b-instruct',
    capabilities: ['chat', 'streaming'],
    implementation: 'openai',
    apiKeyPlaceholder: 'nvapi-...',
    baseUrlPlaceholder: 'https://integrate.api.nvidia.com/v1',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: 'gemini',
    tier: 'paid',
    description: 'Gemini 2.0 Flash, Gemini Pro. API oficial do Google.',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    baseUrlEditable: false,
    requiresApiKey: true,
    defaultModel: 'gemini-2.0-flash',
    capabilities: ['chat', 'streaming'],
    implementation: 'gemini',
    apiKeyPlaceholder: 'AIza...',
  },

  // ── Custom (OpenAI-compatible) ─────────────────────────────────────────
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    icon: 'custom',
    tier: 'local',
    description: 'Qualquer endpoint compatível com a API da OpenAI (LM Studio, vLLM, etc).',
    defaultBaseUrl: 'http://localhost:1234/v1',
    baseUrlEditable: true,
    requiresApiKey: false,
    defaultModel: 'default',
    capabilities: ['chat', 'streaming', 'tools'],
    implementation: 'openai',
    baseUrlPlaceholder: 'http://localhost:1234/v1',
  },
] as const;

/** Busca um provider pelo ID. */
export function getCatalogEntry(id: string): ProviderCatalogEntry | undefined {
  return PROVIDER_CATALOG.find((e) => e.id === id);
}

/** Lista todos os providers de um tier específico. */
export function getCatalogByTier(tier: ProviderCatalogEntry['tier']): readonly ProviderCatalogEntry[] {
  return PROVIDER_CATALOG.filter((e) => e.tier === tier);
}
