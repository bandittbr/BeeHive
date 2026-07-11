/**
 * LLMRouter — Roteador Inteligente de LLMs.
 *
 * Gerencia múltiplos provedores de IA (OpenRouter, Groq, OpenAI, etc.),
 * faz failover automático quando um bate rate-limit ou fica indisponível,
 * e reconhece consumo de tokens para decidir quando trocar de modelo.
 *
 * Estratégia de roteamento:
 * 1. Tenta o provider primário (ex.: Groq — mais rápido e gratuito)
 * 2. Se falhar por rate-limit (429) ou erro 5xx, tenta o próximo
 * 3. Se todos falharem, propaga o erro
 * 4. Monitora tokens gastos por janela de tempo para evitar estouro
 */

import type { ILogger } from '../../kernel';
import { BaseAIProvider } from '../BaseAIProvider';
import type {
  AICapability,
  AIContext,
  AIProvider,
  AIProviderHealth,
  AIRequest,
  AIResponse,
  AIStreamHandlers,
  ChatInput,
  ChatOutput,
  ToolCallResult,
} from '../types';

// ---------------------------------------------------------------------------
// Configuração de um provedor no roteador
// ---------------------------------------------------------------------------

export interface RouterProviderConfig {
  /** Id único do provedor (ex.: 'groq', 'openrouter', 'openai') */
  id: string;
  /** Nome amigável */
  name: string;
  /** Instância do provider */
  provider: AIProvider;
  /** Modelo a usar neste provider */
  model: string;
  /** Prioridade (menor = tentado primeiro) */
  priority: number;
  /** Máximo de requisições por minuto (rate-limit) */
  maxRequestsPerMinute?: number;
  /** Máximo de tokens por minuto */
  maxTokensPerMinute?: number;
}

// ---------------------------------------------------------------------------
// Opções do LLMRouter
// ---------------------------------------------------------------------------

export interface LLMRouterOptions {
  /** Lista de provedores configurados */
  providers: RouterProviderConfig[];
  /** Logger */
  logger?: ILogger;
  /** Intervalo de reset da janela de rate-limit em ms (padrão: 60s) */
  rateLimitWindowMs?: number;
}

// ---------------------------------------------------------------------------
// Controle de rate-limit por janela
// ---------------------------------------------------------------------------

interface RateLimitBucket {
  requests: number;
  tokens: number;
  resetAt: number;
}

// ---------------------------------------------------------------------------
// LLMRouter — implementa AIProvider
// ---------------------------------------------------------------------------

/**
 * LLMRouter — um provedor virtual que delega para provedores reais.
 *
 * Funciona como um AIProvider normal (pode ser registrado no ProviderManager).
 * Internamente gerencia failover, rate-limit e roteamento.
 */
export class LLMRouter extends BaseAIProvider {
  readonly id = 'llmrouter';
  readonly name = 'LLM Router';
  readonly capabilities: readonly AICapability[] = ['chat'];

  private readonly providers: RouterProviderConfig[];
  private readonly logger?: ILogger;
  private readonly rateLimitWindowMs: number;
  private readonly buckets = new Map<string, RateLimitBucket>();
  private lastHealth: AIProviderHealth = { ok: true };

  constructor(options: LLMRouterOptions) {
    super();
    this.providers = [...options.providers].sort((a, b) => a.priority - b.priority);
    this.logger = options.logger?.child('ai:router');
    this.rateLimitWindowMs = options.rateLimitWindowMs ?? 60_000;
  }

  /** Lista os provedores registrados (para debug/status). */
  getProviderList(): readonly RouterProviderConfig[] {
    return this.providers;
  }

  // -----------------------------------------------------------------------
  // AIProvider: execute
  // -----------------------------------------------------------------------

  async execute(request: AIRequest, context: AIContext): Promise<AIResponse> {
    if (request.capability !== 'chat') {
      throw new Error(`LLMRouter não suporta a capacidade "${request.capability}" (só "chat").`);
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('LLMRouter: "messages" é obrigatório.');
    }

    // Tenta cada provider em ordem de prioridade
    const errors: string[] = [];

    for (const cfg of this.providers) {
      if (!this.canAcceptRequest(cfg)) {
        errors.push(`${cfg.id}: rate-limit excedido`);
        continue;
      }

      try {
        const providerRequest: AIRequest = {
          ...request,
          options: { ...request.options, model: cfg.model, provider: cfg.id },
        };

        const response = await cfg.provider.execute(providerRequest, context);

        // Registra consumo
        this.recordUsage(cfg, response);

        this.markHealthy();
        return {
          ...response,
          provider: `router:${cfg.id}`,
          model: cfg.model,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`${cfg.id}: ${msg}`);
        this.logger?.warn(`LLMRouter: ${cfg.id} falhou, tentando próximo...`, { error: msg });

        // Se for rate-limit (429), marca como excedido
        if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
          this.exhaustRateLimit(cfg);
        }
      }
    }

    this.markUnhealthy(errors.join('; '));
    throw new Error(`LLMRouter: todos os provedores falharam. ${errors.join(' | ')}`);
  }

  // -----------------------------------------------------------------------
  // AIProvider: stream
  // -----------------------------------------------------------------------

  async stream(request: AIRequest, handlers: AIStreamHandlers, context: AIContext): Promise<void> {
    if (request.capability !== 'chat') {
      throw new Error(`LLMRouter não suporta streaming para a capacidade "${request.capability}".`);
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('LLMRouter: "messages" é obrigatório para streaming.');
    }

    const errors: string[] = [];

    for (const cfg of this.providers) {
      if (!this.canAcceptRequest(cfg)) {
        errors.push(`${cfg.id}: rate-limit excedido`);
        continue;
      }

      if (!cfg.provider.stream) {
        errors.push(`${cfg.id}: não suporta streaming`);
        continue;
      }

      try {
        const providerRequest: AIRequest = {
          ...request,
          options: { ...request.options, model: cfg.model, provider: cfg.id },
        };

        // Wrap handlers para capturar o consumo no onDone
        let fullText = '';
        const wrappedHandlers: AIStreamHandlers = {
          onDelta: (text: string) => {
            fullText += text;
            handlers.onDelta(text);
          },
          onDone: (response: AIResponse) => {
            this.recordUsage(cfg, response);
            this.markHealthy();
            handlers.onDone?.({
              ...response,
              provider: `router:${cfg.id}`,
              model: cfg.model,
            });
          },
          onError: (message: string) => {
            handlers.onError?.(message);
          },
        };

        await cfg.provider.stream(providerRequest, wrappedHandlers, context);
        return;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`${cfg.id}: ${msg}`);
        this.logger?.warn(`LLMRouter (stream): ${cfg.id} falhou, tentando próximo...`, { error: msg });

        if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
          this.exhaustRateLimit(cfg);
        }
      }
    }

    this.markUnhealthy(errors.join('; '));
    handlers.onError?.(`LLMRouter: todos os provedores falharam. ${errors.join(' | ')}`);
    throw new Error(`LLMRouter: todos os provedores falharam. ${errors.join(' | ')}`);
  }

  // -----------------------------------------------------------------------
  // AIProvider: continueConversation (Agent Loop)
  // -----------------------------------------------------------------------

  async continueConversation(
    request: AIRequest,
    response: AIResponse,
    toolResults: readonly ToolCallResult[],
    context: AIContext,
  ): Promise<AIResponse> {
    // Extrai qual provider original foi usado
    const originalProvider = response.provider?.replace('router:', '') ?? '';
    const cfg = this.providers.find((p) => p.id === originalProvider);

    if (cfg) {
      try {
        const providerRequest: AIRequest = {
          ...request,
          options: { ...request.options, model: cfg.model, provider: cfg.id },
        };
        const result = await cfg.provider.continueConversation!(
          providerRequest,
          response,
          toolResults,
          context,
        );
        this.recordUsage(cfg, result);
        this.markHealthy();
        return {
          ...result,
          provider: `router:${cfg.id}`,
          model: cfg.model,
        };
      } catch (error) {
        this.logger?.warn(`LLMRouter continueConversation: ${cfg.id} falhou, tentando execute() puro`, { error });
      }
    }

    // Fallback: faz execute() normal no melhor provider disponível
    const chatInput: ChatInput = {
      messages: [
        ...((request.input as ChatInput)?.messages ?? []),
        { role: 'assistant', content: (response.output as ChatOutput)?.message?.content ?? '' },
      ],
    };
    return this.execute({ ...request, input: chatInput }, context);
  }

  // -----------------------------------------------------------------------
  // AIProvider: health
  // -----------------------------------------------------------------------

  health(): AIProviderHealth {
    return this.lastHealth;
  }

  // -----------------------------------------------------------------------
  // Rate-limit interno
  // -----------------------------------------------------------------------

  private getBucket(cfg: RouterProviderConfig): RateLimitBucket {
    let bucket = this.buckets.get(cfg.id);
    const now = Date.now();

    if (!bucket || now >= bucket.resetAt) {
      bucket = { requests: 0, tokens: 0, resetAt: now + this.rateLimitWindowMs };
      this.buckets.set(cfg.id, bucket);
    }

    return bucket;
  }

  private canAcceptRequest(cfg: RouterProviderConfig): boolean {
    const bucket = this.getBucket(cfg);

    if (cfg.maxRequestsPerMinute && bucket.requests >= cfg.maxRequestsPerMinute) {
      return false;
    }
    if (cfg.maxTokensPerMinute && bucket.tokens >= cfg.maxTokensPerMinute) {
      return false;
    }

    return true;
  }

  private recordUsage(cfg: RouterProviderConfig, response: AIResponse): void {
    const bucket = this.getBucket(cfg);
    bucket.requests++;

    if (response.usage?.totalTokens) {
      bucket.tokens += response.usage.totalTokens;
    }
  }

  private exhaustRateLimit(cfg: RouterProviderConfig): void {
    const bucket = this.getBucket(cfg);
    // Marca como excedido até o próximo reset
    if (cfg.maxRequestsPerMinute) {
      bucket.requests = cfg.maxRequestsPerMinute;
    }
  }

  private markHealthy(): void {
    this.lastHealth = { ok: true };
  }

  private markUnhealthy(detail: string): void {
    this.lastHealth = { ok: false, detail };
    this.logger?.warn('LLMRouter: todos os provedores falharam', { detail });
  }
}

// ---------------------------------------------------------------------------
// Fábrica
// ---------------------------------------------------------------------------

export function createLLMRouter(options: LLMRouterOptions): LLMRouter {
  return new LLMRouter(options);
}
