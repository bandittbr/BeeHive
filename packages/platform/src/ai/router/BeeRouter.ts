/**
 * BeeRouter — Roteador Inteligente de LLMs para o BeeHive.
 *
 * Inspirado no 9router (https://github.com/decolua/9router):
 * - 3 tiers de provedores: local (Ollama) → apikey (OpenRouter, Groq) → free (Kiro, etc.)
 * - Fallback automático entre provedores com backoff exponencial
 * - Múltiplas contas por provider (round-robin)
 * - Combos nomeados de modelos
 * - Detecção de rate-limit com cooldown inteligente
 *
 * Uso:
 *   const router = new BeeRouter({
 *     providers: [
 *       { id: 'ollama', category: 'local', provider: ollamaProvider, model: 'llama3', priority: 1, enabled: true },
 *       { id: 'openrouter', category: 'apikey', provider: orProvider, model: '...', priority: 2, enabled: true },
 *     ],
 *     combos: [{ id: 'default', name: 'Padrão', models: [{ providerId: 'ollama', model: 'llama3' }] }],
 *   });
 *   await router.execute(request, context);
 */

import { BaseAIProvider } from '../BaseAIProvider';
import type {
  AICapability,
  AIContext,
  AIProviderHealth,
  AIRequest,
  AIResponse,
  AIStreamHandlers,
  ChatInput,
  ChatOutput,
  ToolCallResult,
} from '../types';
import { classifyError, extractHttpStatus } from './errorClassifier';
import type {
  BackoffState,
  BeeRouterOptions,
  BeeRouterSnapshot,
  ClassifiedError,
  Combo,
  ProviderConfig,
  RateLimitBucket,
} from './types';

// ---------------------------------------------------------------------------
// BeeRouter
// ---------------------------------------------------------------------------

export class BeeRouter extends BaseAIProvider {
  readonly id = 'beerouter';
  readonly name = 'Bee Router';
  readonly capabilities: readonly AICapability[] = ['chat'];

  private readonly providers: Map<string, ProviderConfig> = new Map();
  private readonly combos: Map<string, Combo> = new Map();
  private readonly rateLimitBuckets = new Map<string, RateLimitBucket>();
  private readonly backoffStates = new Map<string, BackoffState>();
  private readonly rateLimitWindowMs: number;
  private readonly logger?: BeeRouterOptions['logger'];

  private activeProviderId: string | null = null;
  private activeModel: string | null = null;
  private activeComboId: string | null = null;
  private lastHealth: AIProviderHealth = { ok: true };

  constructor(options: BeeRouterOptions) {
    super();
    this.rateLimitWindowMs = options.rateLimitWindowMs ?? 60_000;
    this.logger = options.logger;

    for (const p of options.providers) {
      this.providers.set(p.id, p);
    }

    if (options.combos) {
      for (const c of options.combos) {
        this.combos.set(c.id, c);
      }
    }

    // Provider com menor prioridade vira o ativo
    const sorted = [...this.providers.values()]
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (sorted.length > 0) {
      this.activeProviderId = sorted[0].id;
      this.activeModel = sorted[0].model;
    }

    // Combo padrão
    if (options.defaultComboId && this.combos.has(options.defaultComboId)) {
      this.activeComboId = options.defaultComboId;
    }
  }

  // -----------------------------------------------------------------------
  // API pública
  // -----------------------------------------------------------------------

  /** Lista os provedores registrados. */
  getProviders(): ProviderConfig[] {
    return [...this.providers.values()];
  }

  /** Lista os combos registrados. */
  getCombos(): Combo[] {
    return [...this.combos.values()];
  }

  /** Provider ativo. */
  getActiveProvider(): ProviderConfig | undefined {
    if (!this.activeProviderId) return undefined;
    return this.providers.get(this.activeProviderId);
  }

  /** Modelo ativo. */
  getActiveModel(): string | null {
    return this.activeModel;
  }

  /** Combo ativo. */
  getActiveCombo(): Combo | undefined {
    if (!this.activeComboId) return undefined;
    return this.combos.get(this.activeComboId);
  }

  /** Troca o provider ativo manualmente. */
  setActiveProvider(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.enabled) return false;
    this.activeProviderId = providerId;
    this.activeModel = provider.model;
    this.activeComboId = null;
    return true;
  }

  /** Troca o combo ativo. */
  setActiveCombo(comboId: string): boolean {
    const combo = this.combos.get(comboId);
    if (!combo) return false;
    this.activeComboId = comboId;
    // Primeiro modelo do combo vira o ativo
    if (combo.models.length > 0) {
      const first = combo.models[0];
      this.activeProviderId = first.providerId;
      this.activeModel = first.model;
    }
    return true;
  }

  /** Habilita/desabilita um provider. */
  setProviderEnabled(providerId: string, enabled: boolean): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return false;
    provider.enabled = enabled;
    if (!enabled && this.activeProviderId === providerId) {
      // Escolhe outro provider
      const next = [...this.providers.values()]
        .filter((p) => p.enabled)
        .sort((a, b) => a.priority - b.priority);
      if (next.length > 0) {
        this.activeProviderId = next[0].id;
        this.activeModel = next[0].model;
      } else {
        this.activeProviderId = null;
        this.activeModel = null;
      }
    }
    return true;
  }

  // -----------------------------------------------------------------------
  // AIProvider: execute
  // -----------------------------------------------------------------------

  async execute(request: AIRequest, context: AIContext): Promise<AIResponse> {
    if (request.capability !== 'chat') {
      throw new Error(`BeeRouter não suporta a capacidade "${request.capability}" (só "chat").`);
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('BeeRouter: "messages" é obrigatório.');
    }

    // Se tem combo ativo, usa fallback entre modelos do combo
    if (this.activeComboId) {
      return this.executeWithCombo(request, context);
    }

    // Fallback simples entre providers habilitados
    return this.executeWithFallback(request, context, this.getEnabledProviders());
  }

  // -----------------------------------------------------------------------
  // AIProvider: stream
  // -----------------------------------------------------------------------

  async stream(request: AIRequest, handlers: AIStreamHandlers, context: AIContext): Promise<void> {
    if (request.capability !== 'chat') {
      throw new Error(`BeeRouter não suporta streaming para a capacidade "${request.capability}".`);
    }

    const input = request.input as ChatInput;
    if (!input?.messages?.length) {
      throw new Error('BeeRouter: "messages" é obrigatório para streaming.');
    }

    if (this.activeComboId) {
      return this.streamWithCombo(request, handlers, context);
    }

    return this.streamWithFallback(request, handlers, context, this.getEnabledProviders());
  }

  // -----------------------------------------------------------------------
  // AIProvider: continueConversation
  // -----------------------------------------------------------------------

  async continueConversation(
    request: AIRequest,
    response: AIResponse,
    toolResults: readonly ToolCallResult[],
    context: AIContext,
  ): Promise<AIResponse> {
    const originalProvider = response.provider?.replace('router:', '') ?? '';
    const cfg = this.providers.get(originalProvider);

    if (cfg && cfg.enabled) {
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
        this.markHealthy();
        return {
          ...result,
          provider: `router:${cfg.id}`,
          model: cfg.model,
        };
      } catch (error) {
        this.logger?.warn?.(
          `BeeRouter continueConversation: ${cfg.id} falhou, tentando execute() puro`,
          { error },
        );
      }
    }

    // Fallback: faz execute() normal
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
  // Snapshot
  // -----------------------------------------------------------------------

  snapshot(): BeeRouterSnapshot {
    return {
      activeProviderId: this.activeProviderId,
      activeModel: this.activeModel,
      activeComboId: this.activeComboId,
      providers: [...this.providers.values()].map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        model: p.model,
        enabled: p.enabled,
        healthy: p.provider.health().ok,
        rateLimited: this.isRateLimited(p.id),
      })),
      combos: [...this.combos.values()].map((c) => ({
        id: c.id,
        name: c.name,
        models: c.models.map((m) => `${m.providerId}/${m.model}`),
      })),
    };
  }

  // -----------------------------------------------------------------------
  // Execução com combo (fallback entre modelos)
  // -----------------------------------------------------------------------

  private async executeWithCombo(request: AIRequest, context: AIContext): Promise<AIResponse> {
    const combo = this.combos.get(this.activeComboId!);
    if (!combo) {
      return this.executeWithFallback(request, context, this.getEnabledProviders());
    }

    const errors: string[] = [];

    for (const modelConfig of combo.models) {
      const provider = this.providers.get(modelConfig.providerId);
      if (!provider || !provider.enabled) {
        errors.push(`${modelConfig.providerId}: provider não disponível`);
        continue;
      }

      if (this.isRateLimited(provider.id)) {
        errors.push(`${provider.id}: rate-limit ativo`);
        continue;
      }

      if (this.isBackedOff(provider.id)) {
        errors.push(`${provider.id}: em backoff`);
        continue;
      }

      try {
        const providerRequest: AIRequest = {
          ...request,
          options: {
            ...request.options,
            model: modelConfig.model,
            provider: provider.id,
          },
        };

        const response = await provider.provider.execute(providerRequest, context);
        this.recordUsage(provider);
        this.markHealthy();
        this.activeProviderId = provider.id;
        this.activeModel = modelConfig.model;
        return {
          ...response,
          provider: `router:${provider.id}`,
          model: modelConfig.model,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`${provider.id}: ${msg}`);
        this.logger?.warn?.(
          `BeeRouter: ${provider.id}/${modelConfig.model} falhou, tentando próximo...`,
          { error: msg },
        );
        this.handleError(provider.id, msg);
      }
    }

    this.markUnhealthy(errors.join('; '));
    throw new Error(`BeeRouter: todos os modelos do combo falharam. ${errors.join(' | ')}`);
  }

  private async streamWithCombo(
    request: AIRequest,
    handlers: AIStreamHandlers,
    context: AIContext,
  ): Promise<void> {
    const combo = this.combos.get(this.activeComboId!);
    if (!combo) {
      return this.streamWithFallback(request, handlers, context, this.getEnabledProviders());
    }

    const errors: string[] = [];

    for (const modelConfig of combo.models) {
      const provider = this.providers.get(modelConfig.providerId);
      if (!provider || !provider.enabled) {
        errors.push(`${modelConfig.providerId}: provider não disponível`);
        continue;
      }

      if (this.isRateLimited(provider.id)) {
        errors.push(`${provider.id}: rate-limit ativo`);
        continue;
      }

      if (this.isBackedOff(provider.id)) {
        errors.push(`${provider.id}: em backoff`);
        continue;
      }

      if (!provider.provider.stream) {
        errors.push(`${provider.id}: não suporta streaming`);
        continue;
      }

      try {
        const providerRequest: AIRequest = {
          ...request,
          options: {
            ...request.options,
            model: modelConfig.model,
            provider: provider.id,
          },
        };

        let fullText = '';
        const wrappedHandlers: AIStreamHandlers = {
          onDelta: (text: string) => {
            fullText += text;
            handlers.onDelta(text);
          },
          onDone: (response: AIResponse) => {
            this.recordUsage(provider);
            this.markHealthy();
            this.activeProviderId = provider.id;
            this.activeModel = modelConfig.model;
            handlers.onDone?.({
              ...response,
              provider: `router:${provider.id}`,
              model: modelConfig.model,
            });
          },
          onError: (message: string) => {
            handlers.onError?.(message);
          },
        };

        await provider.provider.stream(providerRequest, wrappedHandlers, context);
        return;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`${provider.id}: ${msg}`);
        this.logger?.warn?.(
          `BeeRouter (stream): ${provider.id}/${modelConfig.model} falhou, tentando próximo...`,
          { error: msg },
        );
        this.handleError(provider.id, msg);
      }
    }

    this.markUnhealthy(errors.join('; '));
    handlers.onError?.(`BeeRouter: todos os modelos do combo falharam. ${errors.join(' | ')}`);
  }

  // -----------------------------------------------------------------------
  // Fallback simples entre providers
  // -----------------------------------------------------------------------

  private async executeWithFallback(
    request: AIRequest,
    context: AIContext,
    providers: ProviderConfig[],
  ): Promise<AIResponse> {
    const errors: string[] = [];

    for (const provider of providers) {
      if (this.isRateLimited(provider.id)) {
        errors.push(`${provider.id}: rate-limit ativo`);
        continue;
      }

      if (this.isBackedOff(provider.id)) {
        errors.push(`${provider.id}: em backoff`);
        continue;
      }

      try {
        const providerRequest: AIRequest = {
          ...request,
          options: {
            ...request.options,
            model: provider.model,
            provider: provider.id,
          },
        };

        const response = await provider.provider.execute(providerRequest, context);
        this.recordUsage(provider);
        this.markHealthy();
        this.activeProviderId = provider.id;
        this.activeModel = provider.model;
        return {
          ...response,
          provider: `router:${provider.id}`,
          model: provider.model,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`${provider.id}: ${msg}`);
        this.logger?.warn?.(
          `BeeRouter: ${provider.id} falhou, tentando próximo...`,
          { error: msg },
        );
        this.handleError(provider.id, msg);
      }
    }

    this.markUnhealthy(errors.join('; '));
    throw new Error(`BeeRouter: todos os provedores falharam. ${errors.join(' | ')}`);
  }

  private async streamWithFallback(
    request: AIRequest,
    handlers: AIStreamHandlers,
    context: AIContext,
    providers: ProviderConfig[],
  ): Promise<void> {
    const errors: string[] = [];

    for (const provider of providers) {
      if (this.isRateLimited(provider.id)) {
        errors.push(`${provider.id}: rate-limit ativo`);
        continue;
      }

      if (this.isBackedOff(provider.id)) {
        errors.push(`${provider.id}: em backoff`);
        continue;
      }

      if (!provider.provider.stream) {
        errors.push(`${provider.id}: não suporta streaming`);
        continue;
      }

      try {
        const providerRequest: AIRequest = {
          ...request,
          options: {
            ...request.options,
            model: provider.model,
            provider: provider.id,
          },
        };

        let fullText = '';
        const wrappedHandlers: AIStreamHandlers = {
          onDelta: (text: string) => {
            fullText += text;
            handlers.onDelta(text);
          },
          onDone: (response: AIResponse) => {
            this.recordUsage(provider);
            this.markHealthy();
            this.activeProviderId = provider.id;
            this.activeModel = provider.model;
            handlers.onDone?.({
              ...response,
              provider: `router:${provider.id}`,
              model: provider.model,
            });
          },
          onError: (message: string) => {
            handlers.onError?.(message);
          },
        };

        await provider.provider.stream(providerRequest, wrappedHandlers, context);
        return;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`${provider.id}: ${msg}`);
        this.logger?.warn?.(
          `BeeRouter (stream): ${provider.id} falhou, tentando próximo...`,
          { error: msg },
        );
        this.handleError(provider.id, msg);
      }
    }

    this.markUnhealthy(errors.join('; '));
    handlers.onError?.(`BeeRouter: todos os provedores falharam. ${errors.join(' | ')}`);
  }

  // -----------------------------------------------------------------------
  // Rate-limit e backoff
  // -----------------------------------------------------------------------

  private getBucket(providerId: string): RateLimitBucket {
    let bucket = this.rateLimitBuckets.get(providerId);
    const now = Date.now();

    if (!bucket || now >= bucket.resetAt) {
      bucket = { requests: 0, tokens: 0, resetAt: now + this.rateLimitWindowMs };
      this.rateLimitBuckets.set(providerId, bucket);
    }

    return bucket;
  }

  private isRateLimited(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return true;

    const bucket = this.getBucket(providerId);

    if (provider.maxRequestsPerMinute && bucket.requests >= provider.maxRequestsPerMinute) {
      return true;
    }
    if (provider.maxTokensPerMinute && bucket.tokens >= provider.maxTokensPerMinute) {
      return true;
    }

    return false;
  }

  private isBackedOff(providerId: string): boolean {
    const state = this.backoffStates.get(providerId);
    if (!state) return false;
    return Date.now() < state.blockedUntil;
  }

  private recordUsage(provider: ProviderConfig): void {
    const bucket = this.getBucket(provider.id);
    bucket.requests++;
  }

  private handleError(providerId: string, errorText: string): void {
    const status = extractHttpStatus(errorText);
    const currentState = this.backoffStates.get(providerId);
    const level = currentState?.level ?? 0;

    const classified: ClassifiedError = classifyError(status, errorText, level);

    if (classified.shouldFallback) {
      this.backoffStates.set(providerId, {
        level: level + 1,
        blockedUntil: Date.now() + classified.cooldownMs,
      });

      this.logger?.warn?.(
        `BeeRouter: ${providerId} bloqueado por ${classified.cooldownMs}ms (nível ${level + 1})`,
        { isRateLimit: classified.isRateLimit, isAuth: classified.isAuth },
      );
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private getEnabledProviders(): ProviderConfig[] {
    return [...this.providers.values()]
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  private markHealthy(): void {
    this.lastHealth = { ok: true };
  }

  private markUnhealthy(detail: string): void {
    this.lastHealth = { ok: false, detail };
    this.logger?.warn?.('BeeRouter: todos os provedores falharam', { detail });
  }
}

// ---------------------------------------------------------------------------
// Fábrica
// ---------------------------------------------------------------------------

export function createBeeRouter(options: BeeRouterOptions): BeeRouter {
  return new BeeRouter(options);
}
