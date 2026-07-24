// ============================================================================
// AI Manager :: Module
// ============================================================================
// Gateway unificado de IA com servidor REST.
// ============================================================================

import express from 'express';
import cors from 'cors';
import { createRouter } from './api/routes';

export interface AIManagerConfig {
  defaultProvider?: string;
  defaultModel?: string;
  api?: { port: number; cors: boolean };
}

export const DEFAULT_AI_CONFIG: AIManagerConfig = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4',
  api: { port: 3095, cors: true },
};

export interface AIProviderClient {
  readonly name: string;
  readonly models: string[];
  complete(req: AICompletionRequest): Promise<AICompletionResponse>;
  stream(req: AICompletionRequest): AsyncGenerator<AIStreamChunk>;
}

export interface AICompletionRequest {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  provider: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

export class AIManagerModule {
  public config: AIManagerConfig;
  private providers = new Map<string, AIProviderClient>();
  private defaultModel = 'gpt-4';
  private app = express();
  private server: ReturnType<typeof express.application.listen> | null = null;
  private running = false;

  constructor(config?: Partial<AIManagerConfig>) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
  }

  registerProvider(name: string, client: AIProviderClient): void {
    this.providers.set(name, client);
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.defaultModel;
    const provider = this.resolveProvider(model);
    return provider.complete(request);
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const model = request.model || this.defaultModel;
    const provider = this.resolveProvider(model);
    for await (const chunk of provider.stream(request)) {
      yield chunk;
    }
  }

  listModels(): Array<{ provider: string; models: string[] }> {
    return Array.from(this.providers.entries()).map(([name, client]) => ({
      provider: name,
      models: client.models || [],
    }));
  }

  async start(): Promise<void> {
    if (this.running) return;
    const apiConfig = this.config.api!;
    if (apiConfig.cors) this.app.use(cors());
    this.app.use(express.json());
    this.app.use('/api/ai', createRouter());
    this.app.get('/health', (_req, res) => res.json({ status: 'ok', module: 'ai-manager' }));
    return new Promise((resolve) => {
      this.server = this.app.listen(apiConfig.port, () => {
        console.log(`[AIManager] API: http://localhost:${apiConfig.port}/api/ai`);
        this.running = true;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.server?.close();
    this.running = false;
  }

  private resolveProvider(model: string): AIProviderClient {
    const prefix = model.split('-')[0];
    const providerName = prefix === 'gpt' ? 'openai' : prefix === 'claude' ? 'anthropic' : prefix === 'gemini' ? 'google' : 'openai';
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Nenhum provedor para: ${model}`);
    return provider;
  }
}

export async function createAIManager(config?: Partial<AIManagerConfig>): Promise<AIManagerModule> {
  return new AIManagerModule(config);
}