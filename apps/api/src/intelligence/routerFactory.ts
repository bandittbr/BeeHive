/**
 * Fábrica do LLMRouter para o BeeHive API.
 *
 * Configura automaticamente os provedores free disponíveis:
 *  - OpenCode Zen (big-pickle, sempre free, sem chave necessária)
 *  - Groq (gratuito, rápido)
 *  - OpenRouter (gratuito, muitos modelos)
 *  - Kiro (Claude via AWS Bedrock, via gateway local)
 *  - Fallback: OpenAI (se configurado)
 *
 * Lê as chaves do config (que vem do .env).
 * Se nenhuma chave estiver configurada, tenta OpenCode Zen como fallback.
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
 *  3. OpenCode Zen (big-pickle, sempre free)
 *  4. Kiro (Claude via AWS Bedrock, via gateway local)
 *  5. OpenAI (fallback pago, se configurado)
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
      maxRequestsPerMinute: 30,
      maxTokensPerMinute: 70_000,
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
      maxRequestsPerMinute: 20,
    });
  }

  // --- OpenCode Zen (prioridade 3: big-pickle, sempre free) ---
  // O OpenCode Zen tem modelos gratuitos como big-pickle.
  // Se o usuário não configurou chave, usamos uma string vazia
  // e o gateway aceita requisições sem auth para modelos free.
  providers.push({
    id: 'opencode',
    name: 'OpenCode Zen',
    apiKey: config.opencode?.apiKey ?? '',
    baseUrl: config.opencode?.baseUrl ?? 'https://opencode.ai/zen/v1',
    model: config.opencode?.model ?? 'big-pickle',
    priority: 3,
    maxRequestsPerMinute: 200, // Free tier: 200 req/5hrs
  });

  // --- Kiro (prioridade 4: Claude via AWS Bedrock) ---
  // Requer Kiro CLI autenticado + kiro-gateway rodando localmente
  if (config.kiro?.apiKey) {
    providers.push({
      id: 'kiro',
      name: 'Kiro (AWS Bedrock)',
      apiKey: config.kiro.apiKey,
      baseUrl: config.kiro.baseUrl,
      model: config.kiro.model,
      priority: 4,
    });
  }

  // --- OpenAI (prioridade 5: fallback pago) ---
  if (config.openai?.apiKey) {
    providers.push({
      id: 'openai',
      name: 'OpenAI',
      apiKey: config.openai.apiKey,
      baseUrl: config.openai.baseUrl,
      model: config.openai.model,
      priority: 5,
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
