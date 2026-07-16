import type { IProvider, ProviderReadiness, ProviderHealth } from '@beehive/sdk';
import type { ILogger } from '@beehive/shared';
import type { IEventBus } from '@beehive/shared';

interface OpenRouterConfig {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  timeout?: number;
  maxRetries?: number;
}

export class OpenRouterProvider implements IProvider {
  readonly id = 'openrouter';
  readonly type = 'ai';
  readonly name = 'OpenRouter';
  readonly capabilities: string[] = ['chat.generate'];

  private config: OpenRouterConfig;
  private logger: ILogger;
  private _readinessCache: ProviderReadiness | null = null;
  private _apiKeyProvided: boolean = false;

  constructor(config: OpenRouterConfig = {}, logger?: ILogger) {
    this.config = {
      apiKey: process.env.OPENROUTER_API_KEY || config.apiKey,
      model: config.model || 'meta-llama/llama-3-8b-instruct:free',
      endpoint: config.endpoint || 'https://openrouter.ai/api/v1',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
    };
    this.logger = logger || { info: () => {}, warn: () => {}, error: () => {} };
    this._apiKeyProvided = !!this.config.apiKey;
  }

  async readiness(): Promise<ProviderReadiness> {
    if (this._readinessCache) return this._readinessCache;

    if (!this._apiKeyProvided) {
      this._readinessCache = {
        status: 'unavailable',
        reason: 'API key não configurada. Defina OPENROUTER_API_KEY ou passe apiKey na config.',
        fix: 'export OPENROUTER_API_KEY=sk-or-v1-...',
      };
      return this._readinessCache;
    }

    this._readinessCache = { status: 'ready' };
    return this._readinessCache;
  }

  async health(): Promise<ProviderHealth> {
    const start = Date.now();

    if (!this._apiKeyProvided) {
      return { status: 'error', latency: Date.now() - start, reason: 'API key não configurada' };
    }

    try {
      const res = await fetch(`${this.config.endpoint}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!res.ok) {
        return {
          status: 'error',
          latency: Date.now() - start,
          reason: `API error: ${res.status} ${res.statusText}`,
        };
      }

      return { status: 'healthy', latency: Date.now() - start };
    } catch (e: any) {
      return {
        status: 'error',
        latency: Date.now() - start,
        reason: e.message,
      };
    }
  }

  async execute(
    capabilityId: string,
    params: Record<string, unknown>,
    ctx: { logger: ILogger; events: IEventBus },
  ): Promise<{ success: boolean; outputs: Record<string, unknown>; error?: string; metrics: { duration: number } }> {
    const start = Date.now();

    if (capabilityId !== 'chat.generate') {
      return {
        success: false,
        outputs: {},
        error: `OpenRouter não suporta capability: ${capabilityId}`,
        metrics: { duration: Date.now() - start },
      };
    }

    if (!this._apiKeyProvided) {
      return {
        success: false,
        outputs: {},
        error: 'API key não configurada. Defina OPENROUTER_API_KEY.',
        metrics: { duration: Date.now() - start },
      };
    }

    const message = (params.message as string) || '';
    const model = (params.model as string) || this.config.model;

    ctx.logger.info(`OpenRouterProvider: chat.generate → ${model}`);

    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const res = await fetch(`${this.config.endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/bandittbr/BeeHive',
            'X-Title': 'BeeHive OS',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: message }],
            max_tokens: 2000,
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          if (res.status === 429) {
            lastError = `Rate limit excedido (${res.status})`;
            await this._delay(1000 * attempt);
            continue;
          }
          return {
            success: false,
            outputs: {},
            error: `API error ${res.status}: ${errBody.slice(0, 200)}`,
            metrics: { duration: Date.now() - start },
          };
        }

        const data = await res.json() as any;
        const text = data.choices?.[0]?.message?.content || '';

        ctx.events.publish({
          type: 'chat:generated',
          source: this.id,
          payload: { model, provider: 'openrouter', message },
          timestamp: Date.now(),
        });

        return {
          success: true,
          outputs: { response: text, usage: data.usage },
          metrics: { duration: Date.now() - start },
        };
      } catch (e: any) {
        lastError = e.message;
        if (attempt < this.config.maxRetries) {
          await this._delay(500 * attempt);
        }
      }
    }

    return {
      success: false,
      outputs: {},
      error: lastError || 'Falha desconhecida após retries',
      metrics: { duration: Date.now() - start },
    };
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
