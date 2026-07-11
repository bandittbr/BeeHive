/**
 * Fábrica do LLMRouter para o BeeHive API.
 *
 * Configura automaticamente os provedores free disponíveis:
 *  - OpenRouter (gratuito, muitos modelos)
 *  - Groq (gratuito, rápido)
 *  - Fallback: OpenAI (se configurado)
 *
 * Lê as chaves do config (que vem do .env).
 * Se nenhuma chave estiver configurada, retorna undefined
 * (o RuntimeManager cai no fallback Ollama).
 */

import { createOpenAIProvider, LLMRouter } from '@beehive/platform';
import type { ILogger } from '@beehive/platform';
import { config } from '../config';

export interface CreateLLMRouterResult {
  router: LLMRouter;
  /** Lista de provedores que foram realmente configurados (com chave) */
  activeProviders: string[];
}

/**
 * Cria o LLMRouter com todos os provedores free disponíveis.
 *
 * Ordem de prioridade (tentativa):
 *  1. Groq (mais rápido, free tier generoso)
 *  2. OpenRouter (muitos modelos free)
 *  3. OpenAI (fallback pago, se configurado)
 */
export function createBeeHiveRouter(logger?: ILogger): CreateLLMRouterResult | undefined {
  const providers: Array<{
    id: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    priority: number;
    maxRequestsPerMinute?: number;
    maxTokensPerMinute?: number;
  }> = [];

  // --- Groq (prioridade 1: mais rápido) ---
  if (config.groq?.apiKey) {
    providers.push({
      id: 'groq',
      name: 'Groq',
      apiKey: config.groq.apiKey,
      baseUrl: config.groq.baseUrl,
      model: config.groq.model,
      priority: 1,
      maxRequestsPerMinute: 30, // Free tier: 30 req/min
      maxTokensPerMinute: 70_000, // ~70k tokens/min
    });
  }

  // --- OpenRouter (prioridade 2: muitos modelos free) ---
  if (config.openrouter?.apiKey) {
    providers.push({
      id: 'openrouter',
      name: 'OpenRouter',
      apiKey: config.openrouter.apiKey,
      baseUrl: config.openrouter.baseUrl,
      model: config.openrouter.model,
      priority: 2,
      maxRequestsPerMinute: 20, // Free tier: ~20 req/min
    });
  }

  // --- OpenAI (prioridade 3: fallback pago) ---
  if (config.openai?.apiKey) {
    providers.push({
      id: 'openai',
      name: 'OpenAI',
      apiKey: config.openai.apiKey,
      baseUrl: config.openai.baseUrl,
      model: config.openai.model,
      priority: 3,
    });
  }

  if (providers.length === 0) {
    return undefined;
  }

  const router = new LLMRouter({
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      model: p.model,
      priority: p.priority,
      maxRequestsPerMinute: p.maxRequestsPerMinute,
      maxTokensPerMinute: p.maxTokensPerMinute,
      provider: createOpenAIProvider({
        apiKey: p.apiKey,
        baseUrl: p.baseUrl,
        model: p.model,
        providerName: p.id,
        logger,
      }),
    })),
    logger,
  });

  return {
    router,
    activeProviders: providers.map((p) => `${p.id}:${p.model}`),
  };
}
